#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#include <ArduinoJson.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <SPI.h>

#define SS_PIN 10
#define RST_PIN 9

#define TX_PIN A0 // Arduino transmit  YELLOW WIRE  labeled RX on printer
#define RX_PIN A1 // Arduino receive   GREEN WIRE   labeled TX on printer

SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial);     // Pass addr to printer constructor

#define CASH_DISPENSE_DELAY 1200
 
MFRC522 rfid(SS_PIN, RST_PIN); // Instance of the class

MFRC522::MIFARE_Key key;
MFRC522::StatusCode status;

// Init array that will store new NUID 
byte nuidPICC[4];

char uidHex[9];  // String to store the hexadecimal UID (8 characters + null terminator)

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
  mySerial.begin(19200);   
  SPI.begin(); // Init SPI bus
  rfid.PCD_Init(); // Init MFRC522 

  for (byte i = 0; i < 6; i++) {
    key.keyByte[i] = 0xFF;
  }
}
  
void loop(){
  if(Serial.available() > 0) {
    StaticJsonDocument<200> docRx;
    String data = Serial.readStringUntil('\n');
    DeserializationError error = deserializeJson(docRx, data);
    String receive_type = docRx["type"];

    if(error) {
      Serial.println(error.c_str());
    } else {
      Serial.println(data);
    }

    if(receive_type == "DISPENSE_CASH") {
      JsonArray cash_combination = docRx["cash_combination"].as<JsonArray>(); // Array that contains the pill to dispense

      for(int i=0; i<cash_combination.size(); i++) {
        int value = cash_combination[i].as<int>();
        delay(CASH_DISPENSE_DELAY);
        // TODO: Dispense money
      }

      transferString("DISPENSE_STATUS", "SUCCESS");
    } else if(receive_type == "PRINT_RECEIPT") {
      String date = docRx["date"];
      String amount = docRx["amount"];
      String combination = docRx["combination"];
      String iban = docRx["iban"];
      String transaction_id = docRx["transaction_id"];

      printBon(date, amount, iban, transaction_id, combination);
      transferString("RECEIPT_STATUS", "SUCCESS"); 
    }
  }

  char customKey = customKeypad.getKey();
  
  if (customKey){
    transferNumber("KEYPAD", customKey);
  }

  byte block4;
  byte block5;
  byte block_length;

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      byte buffer1[18];
      byte buffer2[18];
      block4 = 4;
      block5 = 5;
      block_length = 18;
      
      status = rfid.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, 4, &key, &(rfid.uid));
      if (status != MFRC522::STATUS_OK) {
        // Serial.print(F("Authentication failed: "));
        // Serial.println(mfrc522.GetStatusCodeName(status));
        return;
      }

      // Reading data from block4
      status = rfid.MIFARE_Read(block4, buffer1, &block_length);
      if (status != MFRC522::STATUS_OK) {
        // Serial.print(F("Reading failed: "));
        // Serial.println(mfrc522.GetStatusCodeName(status));
        return;
      }

      // Reading data from block5
      status = rfid.MIFARE_Read(block5, buffer2, &block_length);
      if (status != MFRC522::STATUS_OK) {
        // Serial.print(F("Reading failed: "));
        // Serial.println(mfrc522.GetStatusCodeName(status));
        return;
      }

      String iban_first_part;
      for (byte i = 0; i < 16; i++) {
        if(buffer1[i] != NULL) {
            iban_first_part += (char) buffer1[i];
        }
      }

      String iban_second_part;
      for (byte i = 0; i < 16; i++) {
        if(buffer2[i] != NULL) {
            iban_second_part += (char) buffer2[i];
        }
      }

      String iban = iban_first_part + iban_second_part;

      uidToHexString(rfid.uid.uidByte, rfid.uid.size, uidHex, sizeof(uidHex));

      transferCardInfo("CARD_INFO", String(uidHex), iban);
  }

  // Halt PICC
  rfid.PICC_HaltA();

  // Stop encryption on PCD
  rfid.PCD_StopCrypto1();

}

void transferNumber(String type, int num) {
  StaticJsonDocument<200> docTx;
  docTx["type"] = type;
  docTx["data"] = num;

  serializeJson(docTx, Serial);
  Serial.println();
}

void transferString(String type, String data) {
  StaticJsonDocument<200> docTx;
  docTx["type"] = type;
  docTx["data"] = data;

  serializeJson(docTx, Serial);
  Serial.println();
}

void transferCardInfo(String type, String uid, String iban) {
  StaticJsonDocument<200> docTx;
  docTx["type"] = type;
  docTx["uid"] = uid;
  docTx["iban"] = iban;

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

void uidToHexString(byte* uidBytes, byte uidSize, char* hexString, size_t hexStringSize) {
    if (hexStringSize < (2 * uidSize + 1)) {
        // Not enough space in the hexString buffer
        return;  // Or handle the error accordingly
    }

    for (byte i = 0; i < uidSize; i++) {
        sprintf(&hexString[i * 2], "%02X", uidBytes[i]);
    }

    hexString[2 * uidSize] = '\0';  // Null terminate the string
}

void printBon(String datum, String bedrag, String rekening, String transactie, String briefjes){
  // printer.begin();        // Init printer (same regardless of serial type)
  printer.begin();
  // The following calls are in setup(), but don't *need* to be.  Use them
  // anywhere!  They're just here so they run one time and are not printed
  // over and over (which would happen if they were in loop() instead).
  // Some functions will feed a line when called, this is normal.

  // Font options
  printer.doubleWidthOn();
  printer.println("Geldautomaat");

  // printer.setSize('M');
   printer.setSize('S');
  printer.setLineHeight(20);
  printer.println(F("Wijnhaven Rotterdam"));
  printer.doubleWidthOff();
  printer.setLineHeight();

  printer.setSize('S');
  printer.setLineHeight(45);
  printer.println(datum);
  printer.setLineHeight();

  printer.doubleHeightOn();
  printer.setLineHeight(45);
  printer.println("Bedankt voor het pinnen bij de");
  printer.doubleHeightOff();

  printer.setSize('L');
  printer.boldOn();
  printer.justify('C');
  printer.setLineHeight(10);
  printer.println(F("Wild West Bank"));
  printer.setLineHeight();
  printer.boldOff();

  printer.setSize('S');
  printer.println(F("Opgenomen bedrag:"));

  printer.boldOn();
  // printer.setSize('M');
  printer.println(bedrag + " EUR");
  printer.boldOff();
  printer.justify('R');
  printer.println(briefjes);


  printer.setLineHeight(45);
  printer.justify('M');
  printer.print(F("Rekening: "));
  printer.println(rekening);
  printer.setLineHeight();
  printer.print(F("Transactie: #"));
  printer.println(transactie);
  printer.setLineHeight();
  printer.setLineHeight(70);
  printer.setSize('L');
  printer.println("Graag tot ziens!");
  
  printer.feed(2);

  printer.sleep();      // Tell printer to sleep
  delay(3000L);         // Sleep for 3 seconds
  printer.wake();       // MUST wake() before printing again, even if reset
  printer.setDefault(); // Restore printer to defaults
}