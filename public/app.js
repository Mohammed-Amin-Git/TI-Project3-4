document.querySelector("#rfid").addEventListener("click", async () => {
    const port = await navigator.serial.requestPort();
    const ports = await navigator.serial.getPorts();
    await port.open({ baudRate: 9600 });
});