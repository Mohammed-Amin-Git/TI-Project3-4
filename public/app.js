window.onload = () => {
    Swal.fire({
        title: "ATM Setup",
        text: "Welcome to the ATM Setup Enviroment!"
    });
};

let port;
document.querySelector("#serial-connector").addEventListener("click", async () => {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    
    await Swal.fire({
        title: "Connected!",
        text: "The client succesfully connected to the microcontroller!",
        icon: "success",
        confirmButtonText: "Continue"
    })

    deactivate_page("#connect-page");
    activate_page("#scan-card-page");

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = port.readable.getReader();
    while(true) {
        const { value, done, } = await reader.read();
        if(done) {
            reader.releaseLock();
            break;
        }
        if(value) {
            console.log(value);
        }
    }

});

function activate_page(id) {
    document.querySelector(id).classList.add("active");
}

function deactivate_page(id) {
    document.querySelector(id).classList.remove("active");
}