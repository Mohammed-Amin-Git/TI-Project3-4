#include <ArduinoJson.h>
#include <Wire.h>

#define CASH_DISPENSE_DELAY 1200
#define SLAVE_ADDRESS 9

char receivedJson[200];
volatile bool dataReceived = false;
volatile bool dispenseComplete = false;

void setup() {
  Serial.begin(9600);
  Wire.begin(SLAVE_ADDRESS);

  Wire.onReceive(receiveEvent);
  Wire.onRequest(requestEvent);
}

void loop() {
  if(dataReceived) {
      StaticJsonDocument<200> docRx;
      DeserializationError error = deserializeJson(docRx, receivedJson);
      
      if(!error) {
        JsonArray billArray = docRx.as<JsonArray>();
        for (int bill : billArray) {
          delay(CASH_DISPENSE_DELAY);
          Serial.println(bill);
        }

        dispenseComplete = true;
        Serial.println();
      } else {
        Serial.println("Error occuredd!");
      }

      dataReceived = false;
  }
}

void receiveEvent(int bytes) {
  int index = 0;
  while (Wire.available() && index < sizeof(receivedJson) - 1) {
    receivedJson[index++] = Wire.read();
  }

  receivedJson[index] = '\0';
  dataReceived = true;
}

void requestEvent() {
    Wire.write(dispenseComplete);
    Serial.println(dispenseComplete);
    if(dispenseComplete) {
      dispenseComplete = false;
    }
}