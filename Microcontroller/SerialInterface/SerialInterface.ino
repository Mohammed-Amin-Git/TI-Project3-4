#include <ArduinoJson.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <SPI.h>

StaticJsonDocument<200> docRx;
StaticJsonDocument<200> docTx;

#define CASH_DISPENSE_DELAY 1200

#define SS_PIN 10
#define RST_PIN 9
 
MFRC522 rfid(SS_PIN, RST_PIN); // Instance of the class

MFRC522::MIFARE_Key key; 

// Init array that will store new NUID 
byte nuidPICC[4];

const byte ROWS = 4; 
const byte COLS = 3; 

char hexaKeys[ROWS][COLS] = {
  {'1', '2', '3'},
  {'4', '5', '6'},
  {'7', '8', '9'},
  {'*', '0', '#'}
};

byte rowPins[ROWS] = {8, 7, 6, 5}; 
byte colPins[COLS] = {4, 3, 2}; 

Keypad customKeypad = Keypad(makeKeymap(hexaKeys), rowPins, colPins, ROWS, COLS); 

unsigned long previous = millis();
long cardInterval = 2500;

void setup(){
  Serial.begin(9600);
  SPI.begin(); // Init SPI bus
  rfid.PCD_Init(); // Init MFRC522 

  for (byte i = 0; i < 6; i++) {
    key.keyByte[i] = 0xFF;
  }
}
  
void loop(){
  if(Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    DeserializationError error = deserializeJson(docRx, data);
    String receive_type = docRx["type"];

    Serial.println(receive_type);

    if(receive_type == "DISPENSE_CASH") {
      JsonArray cash_combination = docRx["cash_combination"].as<JsonArray>(); // Array that contains the pill to dispense

      for(int i=0; i<cash_combination.size(); i++) {
        int value = cash_combination[i].as<int>();
        delay(CASH_DISPENSE_DELAY);
        // TODO: Dispense money
      }

      transferString("DISPENSE_STATUS", "SUCCESS");
    }
  }

  char customKey = customKeypad.getKey();
  
  if (customKey){
    transferNumber("KEYPAD", customKey);
  }

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      printHex(rfid.uid.uidByte, rfid.uid.size);
  }

  // Halt PICC
  rfid.PICC_HaltA();

  // Stop encryption on PCD
  rfid.PCD_StopCrypto1();

}

void transferNumber(String type, int num) {
  docTx["type"] = type;
  docTx["data"] = num;

  serializeJson(docTx, Serial);
  Serial.println();
}

void transferString(String type, String data) {
  docTx["type"] = type;
  docTx["data"] = data;

  serializeJson(docTx, Serial);
  Serial.println();
}

void printHex(byte *buffer, byte bufferSize) {
  for (byte i = 0; i < bufferSize; i++) {
    Serial.print(buffer[i] < 0x10 ? " 0" : " ");
    Serial.print(buffer[i], HEX);
  }
  Serial.println();
}