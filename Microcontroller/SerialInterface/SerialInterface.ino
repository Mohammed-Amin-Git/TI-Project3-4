#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#include <ArduinoJson.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <SPI.h>

#define TX_PIN A0 // Arduino transmit  YELLOW WIRE  labeled RX on printer
#define RX_PIN A1 // Arduino receive   GREEN WIRE   labeled TX on printer

SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial);     // Pass addr to printer constructor

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
  mySerial.begin(19200);
  printer.begin();   
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
      Serial.println(date + amount + combination + iban + transaction_id);


      printBon(date, amount, iban, transaction_id, combination);

      transferString("RECEIPT_STATUS", "SUCCESS");
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

void printBon(String datum, String bedrag, String rekening, String transactie, String briefjes){
  // printer.begin();        // Init printer (same regardless of serial type)

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
  printer.println(F("Wild West Bank!"));
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
  printer.print(F("Transactie: "));
  printer.println(transactie);
  printer.setLineHeight();
  printer.setLineHeight(70);
  printer.setSize('L');
  printer.println("Graag tot ziens!");
  // printer.doubleHeightOff();




  // printer.setFont('A');
  // printer.println("FontA (default)");
  

  // // Test inverse on & off
  // printer.inverseOn();
  // printer.println(F("Inverse ON"));
  // printer.inverseOff();

  // // Test character double-height on & off
  // printer.doubleHeightOn();
  // printer.println(F("Double Height ON"));
  // printer.doubleHeightOff();

  // // Set text justification (right, center, left) -- accepts 'L', 'C', 'R'
  // printer.justify('R');
  // printer.println(F("Right justified"));
  // printer.justify('C');
  // printer.println(F("Center justified"));
  // printer.justify('L');
  // printer.println(F("Left justified"));

  // // Test more styles
  // printer.boldOn();
  // printer.println(F("Bold text"));
  // printer.boldOff();

  // printer.underlineOn();
  // printer.println(F("Underlined text"));
  // printer.underlineOff();

  // printer.setSize('L');        // Set type size, accepts 'S', 'M', 'L'
  // printer.println(F("Large"));
  // printer.setSize('M');
  // printer.println(F("Medium"));
  // printer.setSize('S');
  // printer.println(F("Small"));

  // printer.justify('C');
  // printer.println(F("normal\nline\nspacing"));
  // printer.setLineHeight(50);
  // printer.println(F("Taller\nline\nspacing"));
  // printer.setLineHeight(); // Reset to default
  // printer.justify('L');

  // Barcode examples:
  // CODE39 is the most common alphanumeric barcode:
  // printer.printBarcode("ADAFRUT", CODE39);
  // printer.setBarcodeHeight(100);
  // // Print UPC line on product barcodes:
  // printer.printBarcode("123456789123", UPC_A);

  // // Print the 75x75 pixel logo in adalogo.h:
  // printer.printBitmap(adalogo_width, adalogo_height, adalogo_data);

  // // Print the 135x135 pixel QR code in adaqrcode.h:
  // printer.printBitmap(adaqrcode_width, adaqrcode_height, adaqrcode_data);
  // printer.println(F("Adafruit!"));
  printer.feed(2);

  printer.sleep();      // Tell printer to sleep
  delay(3000L);         // Sleep for 3 seconds
  printer.wake();       // MUST wake() before printing again, even if reset
  printer.setDefault(); // Restore printer to defaults
}