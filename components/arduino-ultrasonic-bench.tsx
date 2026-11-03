'use client'
import { useState } from 'react'
const arduinoSketch = `/*
 * CMC Robotics Lab - firmware de référence du banc USB
 * Protocole ligne : une commande par ligne, une réponse PASS/FAIL.
 * Câblage de base : HC-SR04 TRIG D9 / ECHO D10, PIR D2, LED D13,
 * servo D6, mesure rail A0 via pont diviseur adapté.
 */
#include <Servo.h>

const uint8_t TRIG_PIN = 9;
const uint8_t ECHO_PIN = 10;
const uint8_t PIR_PIN = 2;
const uint8_t LED_PIN = LED_BUILTIN;
const uint8_t SERVO_PIN = 6;
const uint8_t POWER_PIN = A0;
const float POWER_DIVIDER_RATIO = 2.0; // adapter au pont réellement monté
Servo benchServo;

void replyError(const char* reason) { Serial.print("ERROR "); Serial.println(reason); }
void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT); pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT); digitalWrite(TRIG_PIN, LOW);
  benchServo.attach(SERVO_PIN); benchServo.write(90);
  Serial.println("READY CMC ROBOTICS LAB protocol:1");
}

void testUltrasonic() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2); digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10); digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (!duration) { Serial.println("ULTRASONIC FAIL error:timeout"); return; }
  float distance = duration * 0.0343 / 2.0;
  Serial.print("ULTRASONIC PASS distance:"); Serial.print(distance, 1); Serial.println(" cm");
}
void testServo() {
  benchServo.write(0); delay(300); benchServo.write(90); delay(300); benchServo.write(180); delay(300); benchServo.write(0);
  Serial.println("SERVO PASS servo:0");
}
void testPower() {
  int raw = analogRead(POWER_PIN);
  float voltage = raw * (5.0 / 1023.0) * POWER_DIVIDER_RATIO;
  if (voltage < 0.1 || voltage > 12.5) { Serial.print("POWER FAIL voltage:"); Serial.println(voltage, 2); return; }
  Serial.print("POWER PASS voltage:"); Serial.print(voltage, 2); Serial.println(" V");
}
void loop() {
  if (!Serial.available()) return;
  String command = Serial.readStringUntil('\n'); command.trim(); command.toUpperCase();
  if (command == "PING") { Serial.println("PONG BOARD PASS"); }
  else if (command == "TEST ULTRASONIC" || command == "DISTANCE") testUltrasonic();
  else if (command == "TEST PIR") { int motion = digitalRead(PIR_PIN); Serial.print("PIR PASS motion:"); Serial.println(motion); }
  else if (command == "TEST LED") { digitalWrite(LED_PIN, HIGH); delay(120); digitalWrite(LED_PIN, LOW); Serial.println("LED PASS led:OFF"); }
  else if (command == "TEST SERVO") testServo();
  else if (command == "TEST POWER") testPower();
  else if (command == "TEST DHT11" || command == "TEST IMU" || command == "TEST LINE" || command == "TEST DC MOTOR" || command == "TEST STEPPER" || command == "TEST DRIVER" || command == "TEST RELAY") replyError("unsupported:use the wiring guide and add the component driver");
  else replyError("unknown-command");
}
`


type State = 'idle' | 'testing' | 'working' | 'faulty'
type Props = { isConnected: boolean; lastDistance: string; boardState: State; sonarState: State; onSendCommand: (command: string) => Promise<void> }
const labels: Record<State, string> = { idle: 'Non testé', testing: 'En attente de la carte…', working: 'Réponse reçue : OK', faulty: 'Échec ou absence de réponse' }
export default function ArduinoUltrasonicBench({ isConnected, lastDistance, boardState, sonarState, onSendCommand }: Props) {
  const [showCode, setShowCode] = useState(false)
  function download() {
    const url = URL.createObjectURL(new Blob([arduinoSketch], { type: 'text/plain' }))
    const link = document.createElement('a'); link.href = url; link.download = 'cmc_ultrasonic.ino'; link.click(); URL.revokeObjectURL(url)
  }
  const busy = boardState === 'testing' || sonarState === 'testing'
  return <section className="glass-panel rounded-2xl p-6 space-y-5">
    <div><p className="eyebrow">Arduino Uno / HC-SR04</p><h2 className="mt-2 text-xl text-white">Banc de mesure USB</h2>
    <p className="mt-2 text-sm text-muted">Téléversez le programme ci-dessous avec Arduino IDE, fermez son moniteur série, puis connectez la carte à 115200 bauds.</p></div>
    <p className="text-sm text-cyan">Câblage : VCC → 5V · GND → GND · TRIG → D9 · ECHO → D10 (Arduino Uno).</p>
    {!isConnected && <p role="status" className="text-orange">Connectez une carte USB pour effectuer les mesures.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="stat-card"><h3>Carte Arduino</h3><p role="status" className="my-3 text-sm text-muted">{isConnected ? labels[boardState] : 'Déconnectée'}</p>
      <button disabled={!isConnected || busy} onClick={() => void onSendCommand('PING')} className="text-cyan disabled:opacity-40">Vérifier la carte</button></div>
      <div className="stat-card"><h3>Capteur ultrason</h3><p className="my-3 text-2xl text-cyan">{isConnected && sonarState === 'working' ? lastDistance : '—'}</p>
      <p role="status" className="mb-3 text-sm text-muted">{isConnected ? labels[sonarState] : 'Aucune mesure'}</p>
      <button disabled={!isConnected || busy} onClick={() => void onSendCommand('TEST ULTRASONIC')} className="text-cyan disabled:opacity-40">Mesurer la distance</button></div>
    </div>
    <div className="flex gap-5 text-sm text-cyan"><button onClick={() => setShowCode(!showCode)}>{showCode ? 'Masquer le code' : 'Voir le programme Arduino'}</button><button onClick={download}>Télécharger .ino</button></div>
    {showCode && <pre className="max-h-96 overflow-auto rounded-xl bg-black/30 p-4 text-xs text-fog">{arduinoSketch}</pre>}
    <p className="text-xs text-muted">Ce firmware de référence prend en charge PING, HC-SR04, PIR, LED, servo et POWER. Les autres tests renvoient explicitement unsupported : ajoutez leur pilote après avoir suivi le guide de câblage.</p>
  </section>
}
