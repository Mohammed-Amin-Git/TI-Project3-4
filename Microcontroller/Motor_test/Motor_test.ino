#define DispenserA1 A1
#define DispenserA2 A0

#define DispenserB1 A3
#define DispenserB2 A2

#define DispenserC1 A5
#define DispenserC2 A4

#define CASH_DISPENSE_DELAY 2000



void setup() {
  pinMode(DispenserA1, OUTPUT);
  pinMode(DispenserA2, OUTPUT);

  pinMode(DispenserB1, OUTPUT);
  pinMode(DispenserB2, OUTPUT);

  pinMode(DispenserC1, OUTPUT);
  pinMode(DispenserC2, OUTPUT);

  digitalWrite(DispenserA1, LOW);
  digitalWrite(DispenserA2, LOW);
  digitalWrite(DispenserB1, LOW);
  digitalWrite(DispenserB2, LOW);
  digitalWrite(DispenserC1, LOW);
  digitalWrite(DispenserC2, LOW);

  pinMode(8, OUTPUT);
}

void loop() {
    digitalWrite(8, HIGH);
}