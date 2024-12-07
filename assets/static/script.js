const DEFAULT_LEVEL = 3;
const MAX_LEVEL = 5;
const MIN_LEVEL = 1;
const ANIMATION_DURATION = 3500;
const SANTA_MOVE_INTERVAL = 250;
const WINNER_DELAY = 2000;
const VOLUME_STEP = 0.1;
const VOLUME_INTERVAL = 100;
const MAX_VISIBLE_CATS = 3;
const CAT_DISPLAY_TIME = 5000;
const CAT_CHECK_INTERVAL = 1000;
const SLIDE_INTERVAL = 10000;
const BT_SERVICE_UUID = '14915f8a-7b1e-46da-8ae2-f323959255ae';
const BT_CHARACTERISTIC_UUID = '85e73371-26eb-47c2-9671-8b60504e7c49';

$(document).ready(function () {
    showModeModal(); // show initial mode picker

    $('#spinButton, #modal-button, #modal-close').click(function () {
        playButtonClickSound();
        if (this.id === 'spinButton') {
            spinWheel();
        } else {
            $('#modal').hide();
        }
    });

    $('#levelSlider').on('input', function () {
        const level = $(this).val();
        updateLevelDescription(level);
        loadItems(level);
    });

    $('#increaseLevel, #decreaseLevel').click(function () {
        playButtonClickSound();
        let level = parseInt($('#levelSlider').val());
        if (this.id === 'increaseLevel' && level < MAX_LEVEL) {
            level++;
        } else if (this.id === 'decreaseLevel' && level > MIN_LEVEL) {
            level--;
        }
        $('#levelSlider').val(level).trigger('input');
    });

    $('#kidButton, #teenButton').click(function () {
        setMode(this.id === 'kidButton' ? 'KID' : 'TEEN');
        playBackgroundMusic();
    });

    roamCats(); // start cat animations
    slideImage(); // start sliding animations
});

function playButtonClickSound() {
    const buttonClickSound = document.getElementById('button-click-sound');
    buttonClickSound.pause();
    buttonClickSound.currentTime = 0;
    buttonClickSound.play();
}

function playDrumrollSound() {
    const drumrollSound = document.getElementById('drumroll-sound');
    drumrollSound.play();
    drumrollSound.onended = playTadaSound;
}

function playTadaSound() {
    const tadaSound = document.getElementById('tada-sound');
    tadaSound.play();
    tadaSound.onended = unmuteAllSounds;
}

function muteAllSounds() {
    const backgroundMusic = document.getElementById('background-music');
    const buttonClickSound = document.getElementById('button-click-sound');
    backgroundMusic.volume = 0;
    buttonClickSound.volume = 0;
}

function unmuteAllSounds() {
    const backgroundMusic = document.getElementById('background-music');
    const buttonClickSound = document.getElementById('button-click-sound');
    let volume = 0;
    const interval = setInterval(() => {
        if (volume < 1) {
            volume = Math.min(volume + VOLUME_STEP, 1);
            backgroundMusic.volume = volume;
            buttonClickSound.volume = volume;
        } else {
            clearInterval(interval);
        }
    }, VOLUME_INTERVAL);
}

function showModeModal() {
    $('#modeModal').show();
}

function setMode(mode) {
    $.ajax({
        url: `/setmode?mode=${mode}`,
        method: 'GET',
        success: function () {
            $('#modeModal').hide();
            loadItems(DEFAULT_LEVEL);
        },
        error: function () {
            alert('Error setting mode');
        }
    });
}

function updateLevelDescription(level) {
    const descriptions = {
        1: "Noob",
        2: "Boomer",
        3: "Balanced",
        4: "Risk taker!",
        5: "Warrior!"
    };
    const images = {
        1: "imgs/noob.png",
        2: "imgs/boomer.png",
        3: "imgs/balanced.png",
        4: "imgs/risktaker.png",
        5: "imgs/warrior.png"
    };
    $('#levelDescription').text(descriptions[level]);
    $('#levelImage').attr('src', images[level]);
}

async function takeChances(level) {
    try {
        const response = await fetch(`/takechances?level=${level}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        generateGrid(data);
    } catch (error) {
        console.error('Error taking chances:', error);
    }
}

async function loadItems(level) {
    try {
        const response = await fetch(`/items?level=${level}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        generateGrid(data);

        // calculate the total stock
        const totalStock = data.reduce((sum, gift) => sum + gift.stocks, 0);
        const spinButton = $('#spinButton');
        if (totalStock <= 0) {
            spinButton.prop('disabled', true).text('Out of stock!').css('background', 'red');
        } else {
            spinButton.prop('disabled', false).text('LET\'S GO!').css('background', '#ffd700');
        }
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

function generateGrid(gifts) {
    const gridContainer = document.getElementById('grid-container');
    gridContainer.innerHTML = ''; // clear grid

    // calculate category chances
    const categoryTotals = {};
    gifts.forEach(gift => {
        if (categoryTotals[gift.category]) {
            categoryTotals[gift.category] += gift.chance;
        } else {
            categoryTotals[gift.category] = gift.chance;
        }
    });

    // calculate final chances
    const totalChance = Object.values(categoryTotals).reduce((sum, chance) => sum + chance, 0);
    gifts.forEach(gift => {
        const adjustedChance = (gift.chance / totalChance) * 100;
        const chancePercentage = adjustedChance.toFixed(2); // ensure chance is a valid number and format it

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${gift.img}" alt="${gift.display}">
            <span>${gift.display}</span>
            <div class="chance">${chancePercentage}%</div>
        `;
        gridContainer.appendChild(card);
    });
}

async function spinWheel() {
    // disable controls during spin
    const spinButton = $('#spinButton');
    const increaseLevelButton = $('#increaseLevel');
    const decreaseLevelButton = $('#decreaseLevel');
    const levelSlider = $('#levelSlider');

    // disable the buttons and slider
    spinButton.prop('disabled', true);
    increaseLevelButton.prop('disabled', true);
    decreaseLevelButton.prop('disabled', true);
    levelSlider.prop('disabled', true);

    try {
        const response = await fetch('/spin');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // start santa animation
        const santa = document.getElementById('santa');
        setTimeout(() => {
            santa.style.display = 'block';
            santa.style.transform = 'translate(0, 0)'; // start at upper left corner
            muteAllSounds();
            playDrumrollSound();
        }, 500);

        const duration = ANIMATION_DURATION;
        const gridContainer = document.getElementById('grid-container');
        const cards = gridContainer.getElementsByClassName('card');
        const numCards = cards.length;

        let currentIndex = 0;
        const interval = setInterval(() => {
            let randomCardIndex = Math.floor(Math.random() * numCards);
            let card = cards[randomCardIndex];
            let rect = card.getBoundingClientRect();
            let randomX = rect.left + Math.random() * rect.width;
            let randomY = rect.top + Math.random() * rect.height;
            santa.style.transition = `transform ${Math.random() * 0.7 + 0.1}s linear`; // random speed
            santa.style.transform = `translate(${randomX}px, ${randomY}px)`;
        }, SANTA_MOVE_INTERVAL);

        setTimeout(() => {
            clearInterval(interval);
            const wonCard = Array.from(cards).find(card => card.querySelector('span').textContent === data.gift);
            const rect = wonCard.getBoundingClientRect();
            santa.style.transition = 'transform 2s ease-in-out'; // slow down transition
            santa.style.transform = `translate(${rect.left + window.scrollX}px, ${rect.top + window.scrollY}px)`;

            // show win animation
            setTimeout(() => {
                showFireworks();
                santa.style.display = 'none';
                santa.style.transition = 'transform 0.5s linear'; // reset santa
                showModal(data.gift, wonCard.querySelector('img').src);
            }, WINNER_DELAY);
        }, duration);
    } catch (error) {
        console.error('Error spinning:', error);
    }
}

function showFireworks() {
    const fireworksContainer = document.getElementById('fireworks-container');
    for (let i = 0; i < 10; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = `${Math.random() * 100}%`;
        firework.style.top = `${Math.random() * 100}%`;
        fireworksContainer.appendChild(firework);

        setTimeout(() => {
            fireworksContainer.removeChild(firework);
        }, 1000);
    }
}

function showModal(gift, imgSrc) {
    $('#modal-img').attr('src', imgSrc);
    $('#modal-title').text(gift);
    $('#modal').show();

    $('#modal-button').off('click').on('click', async function () {
        playButtonClickSound();
        $('#modal').hide();
        $('#levelSlider').val(3).trigger('input'); // re-align the risk slider to level 3
        await recheckStocks();
        // re-enable the buttons and slider
        $('#spinButton').prop('disabled', false);
        $('#increaseLevel').prop('disabled', false);
        $('#decreaseLevel').prop('disabled', false);
        $('#levelSlider').prop('disabled', false);
    });
}

async function recheckStocks() {
    try {
        const response = await fetch(`/items?level=${$('#levelSlider').val()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // calculate the total stock
        const totalStock = data.reduce((sum, gift) => sum + gift.stocks, 0);
        const spinButton = $('#spinButton');
        if (totalStock <= 0) {
            spinButton.prop('disabled', true).text('Out of stock!').css('background', 'red');
        } else {
            spinButton.prop('disabled', false).text('LET\'S GO!').css('background', '#ffd700');
        }
    } catch (error) {
        console.error('Error rechecking stocks:', error);
    }
}

function roamCats() {
    const cats = document.querySelectorAll('.cat');
    let visibleCats = [];

    function showCat() {
        if (visibleCats.length < MAX_VISIBLE_CATS) {
            const randomCat = cats[Math.floor(Math.random() * cats.length)];
            if (!visibleCats.includes(randomCat)) {
                visibleCats.push(randomCat);
                randomCat.style.display = 'block';
                randomCat.style.width = `${Math.random() * 60 + 130}px`; // random size between 130px and 250px
                randomCat.style.transform = `rotate(${Math.random() * 360}deg)`; // random rotation
                let randomX, randomY;
                do {
                    randomX = Math.random() * (window.innerWidth - randomCat.clientWidth);
                    randomY = Math.random() * (window.innerHeight - randomCat.clientHeight);
                } while (visibleCats.some(cat => {
                    const catRect = cat.getBoundingClientRect();
                    return Math.abs(randomX - catRect.left) < 150 && Math.abs(randomY - catRect.top) < 150;
                }));
                randomCat.style.left = `${randomX}px`;
                randomCat.style.top = `${randomY}px`;
                setTimeout(() => {
                    randomCat.style.display = 'none';
                    visibleCats = visibleCats.filter(cat => cat !== randomCat);
                }, CAT_DISPLAY_TIME);
            }
        }
        setTimeout(showCat, CAT_CHECK_INTERVAL);
    }

    showCat();
}

function slideImage() {
    const slidingImage = document.getElementById('sliding');
    let direction = 'left-to-right';

    function animate() {
        if (direction === 'left-to-right') {
            slidingImage.style.animation = 'slide-left-to-right 10s linear infinite';
            direction = 'right-to-left';
        } else {
            slidingImage.style.animation = 'slide-right-to-left 10s linear infinite';
            direction = 'left-to-right';
        }
    }

    animate();
    setInterval(animate, SLIDE_INTERVAL);
}

function playBackgroundMusic() {
    const backgroundMusic = document.getElementById('background-music');
    backgroundMusic.loop = true;
    backgroundMusic.play().catch((error) => {
        console.log('Autoplay was prevented. User interaction is required to start the music.', error);
    });
}

let bluetoothDevice;
let bluetoothServer;
let bluetoothService;
let bluetoothCharacteristic;

async function connectBluetooth() {
    const connectButton = document.getElementById('connectButton');
    try {
        console.log("Requesting Bluetooth Device...");
        connectButton.textContent = "Connecting...";
        connectButton.style.backgroundColor = "gray";

        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'xmas app controller' }],
            optionalServices: [BT_SERVICE_UUID]
        });

        console.log("Connecting to GATT Server...");
        bluetoothServer = await bluetoothDevice.gatt.connect();

        console.log("Getting Primary Service...");
        bluetoothService = await bluetoothServer.getPrimaryService(BT_SERVICE_UUID);

        console.log("Getting Characteristic...");
        bluetoothCharacteristic = await bluetoothService.getCharacteristic(BT_CHARACTERISTIC_UUID);

        console.log("Starting Notifications...");
        await bluetoothCharacteristic.startNotifications();

        bluetoothCharacteristic.addEventListener('characteristicvaluechanged', handleBluetoothData);

        console.log("Bluetooth connected and notifications started.");
        connectButton.textContent = "Connected to BT";
        connectButton.style.backgroundColor = "green";
    } catch (error) {
        console.error("Error connecting to Bluetooth device:", error);
        connectButton.textContent = "Re-connect to BT";
        connectButton.style.backgroundColor = "red";
    }
}

function handleBluetoothData(event) {
    const value = new TextDecoder().decode(event.target.value);
    console.log("Received:", value);

    const modeModalVisible = $('#modeModal').is(':visible');
    const prizeModalVisible = $('#modal').is(':visible');

    if (modeModalVisible) {
        if (value.trim() === "button1") {
            document.getElementById("kidButton").click();
        } else if (value.trim() === "button2") {
            document.getElementById("teenButton").click();
        }
    } else if (prizeModalVisible) {
        if (value.trim() === "button3") {
            document.getElementById("modal-button").click();
        }
    } else {
        if (value.trim() === "button1") {
            document.getElementById("decreaseLevel").click();
        } else if (value.trim() === "button2") {
            document.getElementById("increaseLevel").click();
        } else if (value.trim() === "button3") {
            document.getElementById("spinButton").click();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("connectButton").addEventListener("click", connectBluetooth);
});
