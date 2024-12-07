package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"
)

const (
	DEFAULT_LEVEL = 3
	MIN_LEVEL     = 1
	MAX_LEVEL     = 5
	CONFIG_FILE   = "configs/config.json"
	SERVER_PORT   = ":8080"
)

type Gift struct {
	ID       int     `json:"id"`
	Category string  `json:"category"`
	Display  string  `json:"display"`
	Stocks   int     `json:"stocks"`
	Chance   float64 `json:"chance"`
	Img      string  `json:"img"`
	Mode     string  `json:"mode"` // KID or TEEN mode
}

type Config struct {
	Gifts []Gift `json:"gifts"`
}

var config Config
var selectedMode string
var teenCategoryChances = map[int]map[string]float64{
	1: {"A": 0.01, "B": 0.90, "C": 0.08, "D": 0.01},
	2: {"A": 0.03, "B": 0.85, "C": 0.09, "D": 0.03},
	3: {"A": 0.05, "B": 0.85, "C": 0.05, "D": 0.05},
	4: {"A": 0.10, "B": 0.48, "C": 0.30, "D": 0.12},
	5: {"A": 0.15, "B": 0.15, "C": 0.20, "D": 0.50},
}

var kidCategoryChances = map[int]map[string]float64{
	1: {"A": 0.25, "B": 0.25, "C": 0.10, "D": 0.25},
	2: {"A": 0.25, "B": 0.25, "C": 0.15, "D": 0.25},
	3: {"A": 0.25, "B": 0.25, "C": 0.20, "D": 0.25},
	4: {"A": 0.25, "B": 0.25, "C": 0.25, "D": 0.25},
	5: {"A": 0.25, "B": 0.25, "C": 0.30, "D": 0.25},
}

func loadConfig() {
	file, err := os.Open(CONFIG_FILE)
	if err != nil {
		log.Fatal("Error loading config.json file:", err)
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		log.Fatal("Error reading config.json file:", err)
	}

	err = json.Unmarshal(bytes, &config)
	if err != nil {
		log.Fatal("Error parsing config.json file:", err)
	}
}

func saveConfig() {
	bytes, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		log.Fatal("Error marshaling config.json file:", err)
	}

	err = os.WriteFile(CONFIG_FILE, bytes, 0644)
	if err != nil {
		log.Fatal("Error writing config.json file:", err)
	}
}

func encodeResponse(w http.ResponseWriter, response interface{}) {
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func spinWheel(w http.ResponseWriter, r *http.Request) {
	// get random seed
	rand.New(rand.NewSource(time.Now().UnixNano()))

	// calculate total chances
	totalChance := 0.0
	for _, gift := range config.Gifts {
		if gift.Stocks > 0 && gift.Mode == selectedMode {
			totalChance += gift.Chance
		}
	}

	// pick random gift
	randomValue := rand.Float64() * totalChance
	cumulativeChance := 0.0
	selectedGift := "None"

	for i, gift := range config.Gifts {
		if gift.Stocks > 0 && gift.Mode == selectedMode {
			cumulativeChance += gift.Chance
			if randomValue <= cumulativeChance {
				selectedGift = gift.Display
				config.Gifts[i].Stocks--
				saveConfig()
				break
			}
		}
	}

	response := map[string]string{"gift": selectedGift}
	encodeResponse(w, response)
}

func listItems(w http.ResponseWriter, r *http.Request) {
	// get risk level
	levelStr := r.URL.Query().Get("level")
	level, err := strconv.Atoi(levelStr)
	if err != nil || level < MIN_LEVEL || level > MAX_LEVEL {
		level = DEFAULT_LEVEL
	}

	// filter gifts by mode
	chances := teenCategoryChances[level]
	if selectedMode == "KID" {
		chances = kidCategoryChances[level]
	}
	filteredGifts := []Gift{}
	for i, gift := range config.Gifts {
		if gift.Mode == selectedMode {
			config.Gifts[i].Chance = chances[gift.Category]
			filteredGifts = append(filteredGifts, config.Gifts[i])
		}
	}

	saveConfig()
	encodeResponse(w, filteredGifts)
}

func setMode(w http.ResponseWriter, r *http.Request) {
	mode := r.URL.Query().Get("mode")
	if mode == "KID" || mode == "TEEN" {
		selectedMode = mode
		w.WriteHeader(http.StatusOK)
		encodeResponse(w, map[string]string{"status": "mode set"})
	} else {
		w.WriteHeader(http.StatusBadRequest)
	}
}

func main() {
	loadConfig()

	// setup routes
	http.HandleFunc("/spin", spinWheel)
	http.HandleFunc("/config", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(config)
	})
	http.HandleFunc("/items", listItems)
	http.HandleFunc("/setmode", setMode)

	// serve static files
	http.Handle("/imgs/", http.StripPrefix("/imgs/", http.FileServer(http.Dir("./assets/images"))))
	http.Handle("/music/", http.StripPrefix("/music/", http.FileServer(http.Dir("./assets/music"))))
	http.Handle("/", http.FileServer(http.Dir("./assets/static")))

	fmt.Printf("server running at %s\n", SERVER_PORT)
	log.Fatal(http.ListenAndServe(SERVER_PORT, nil))
}
