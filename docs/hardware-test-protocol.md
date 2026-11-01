# Hardware Test Protocol

The web Circuit Tester uses the Web Serial API. It sends one newline-terminated command at the selected baud rate and waits up to three seconds for a response.

## Connection sequence

1. Open `/circuit-tester` in Chrome or Edge on desktop.
2. Select the Arduino, ESP32, or compatible USB serial board.
3. Choose the same baud rate as the firmware, normally `115200`.
4. The interface opens the USB port and starts a line-based RX reader.
5. Use **Send PING check**. The board should answer `PONG`, `READY`, `HELLO`, or `HANDSHAKE OK`.
6. A hardware check is marked **Working** only after a matching `PASS`, `OK`, `READY`, or sensor response is received. If no response arrives within three seconds, it becomes **Faulty**.

## Supported commands

| Command | Expected response | Component family |
|---|---|---|
| `PING` | `PONG` or `READY` | Arduino / ESP32 board |
| `TEST ULTRASONIC` | `ULTRASONIC PASS distance: 24.8 cm` | HC-SR04 |
| `TEST PIR` | `PIR PASS motion: 0` | PIR sensor |
| `TEST LINE` | `LINE PASS values: 1,0,1,1,0` | IR line array |
| `TEST DHT11` | `DHT11 PASS temperature: 23.4 C humidity: 48` | DHT11 |
| `TEST IMU` | `IMU PASS accel: 0.01 gyro: 0.02` | MPU6050 |
| `TEST SERVO` | `SERVO PASS servo: 90` | SG90 servo |
| `TEST DC MOTOR` | `DC MOTOR PASS` | TT gear motors |
| `TEST STEPPER` | `STEPPER PASS` | 28BYJ-48 |
| `TEST DRIVER` | `DRIVER PASS` | L298N |
| `TEST RELAY` | `RELAY PASS state: ON` | 1-channel relay |
| `TEST LED` | `LED PASS led: ON` | LED / GPIO |
| `TEST POWER` | `POWER PASS voltage: 5.0 V` | Power rail / continuity |

The parser is intentionally tolerant: it accepts component keywords plus `PASS`, `OK`, `READY`, `PONG`, `FAIL`, `FAULT`, `ERROR`, or `TIMEOUT`. It also extracts distance, servo angle, temperature, LED state, and voltage values from the live readings panel.

## Minimal Arduino firmware example

```cpp
void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("READY");
}

void loop() {
  if (!Serial.available()) return;
  String command = Serial.readStringUntil('\n');
  command.trim();

  if (command == "PING") {
    Serial.println("PONG");
  } else if (command == "TEST LED") {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(120);
    digitalWrite(LED_BUILTIN, LOW);
    Serial.println("LED PASS led: OFF");
  } else if (command == "TEST ULTRASONIC") {
    // Replace with a real trigger/echo measurement in the final sketch.
    Serial.println("ULTRASONIC PASS distance: 24.8 cm");
  } else if (command.startsWith("TEST ")) {
    Serial.print(command.substring(5));
    Serial.println(" PASS");
  } else {
    Serial.println("ERROR unknown command");
  }
}
```

For production use, replace the placeholder responses with real GPIO, I²C, PWM, ADC, and continuity measurements for the board wiring in the lab.
