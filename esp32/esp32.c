#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <ezButton.h>

#define SERVICE_UUID "14915f8a-7b1e-46da-8ae2-f323959255ae"
#define CHARACTERISTIC_UUID "85e73371-26eb-47c2-9671-8b60504e7c49"

BLECharacteristic *pCharacteristic;

const int ledPin1 = 25;
const int buttonPin1 = 12;

const int ledPin2 = 26;
const int buttonPin2 = 13;

const int ledPin3 = 27;
const int buttonPin3 = 14;

const int onboardLedPin = 2;

ezButton button1(buttonPin1);
ezButton button2(buttonPin2);
ezButton button3(buttonPin3);

bool deviceConnected = false;
unsigned long lastBlinkTime = 0;
bool ledState = LOW;

// handles ble connection state
class MyServerCallbacks : public BLEServerCallbacks
{
    void onConnect(BLEServer *pServer)
    {
        deviceConnected = true;
        Serial.println("Device connected");
    }

    void onDisconnect(BLEServer *pServer)
    {
        deviceConnected = false;
        Serial.println("Device disconnected");
    }
};

void setup()
{
    Serial.begin(115200);

    // set up pins
    pinMode(ledPin1, OUTPUT);
    pinMode(ledPin2, OUTPUT);
    pinMode(ledPin3, OUTPUT);
    pinMode(onboardLedPin, OUTPUT);

    // Enable internal pull-up resistors for the buttons
    pinMode(buttonPin1, INPUT_PULLUP);
    pinMode(buttonPin2, INPUT_PULLUP);
    pinMode(buttonPin3, INPUT_PULLUP);

    digitalWrite(onboardLedPin, LOW);
    digitalWrite(ledPin1, LOW);
    digitalWrite(ledPin2, LOW);
    digitalWrite(ledPin3, LOW);

    // set button debounce time to 50ms
    button1.setDebounceTime(50);
    button2.setDebounceTime(50);
    button3.setDebounceTime(50);

    // init BLE service
    BLEDevice::init("xmas app controller");
    BLEServer *pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);

    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_NOTIFY);

    pCharacteristic->addDescriptor(new BLE2902());
    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->start();

    Serial.println("BLE Service is ready.");
}

void loop()
{
    // update buttons
    button1.loop();
    button2.loop();
    button3.loop();

    handleOnboardLED();
    handleButton(button1, ledPin1, "button1");
    handleButton(button2, ledPin2, "button2");
    handleButton(button3, ledPin3, "button3");

    delay(10);
}

void handleOnboardLED()
{
    if (deviceConnected)
    {
        // keep led on when connected
        digitalWrite(onboardLedPin, HIGH);
    }
    else
    {
        // blink led when disconnected
        unsigned long currentTime = millis();
        if (currentTime - lastBlinkTime >= 500)
        {
            ledState = !ledState;
            digitalWrite(onboardLedPin, ledState);
            lastBlinkTime = currentTime;
        }
    }
}

// handle button press and notify connected device
void handleButton(ezButton &button, int ledPin, const char *message)
{
    if (button.isPressed())
    {
        digitalWrite(ledPin, HIGH);
        if (deviceConnected)
        {
            pCharacteristic->setValue(message);
            pCharacteristic->notify();
            Serial.print("Button pressed: ");
            Serial.println(message);
        }
    }
    else if (button.isReleased())
    {
        digitalWrite(ledPin, LOW);
    }
}
