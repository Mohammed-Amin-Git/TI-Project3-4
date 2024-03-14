let CLIENT_STATE = "NULL";

document.querySelector("#start").addEventListener("click", () => {
    deactivate_page("#connect-page")
    activate_page("#scan-card-page")

    CLIENT_STATE = "SCAN_CARD";

    const socket = new WebSocket("ws://localhost:8080");

    socket.addEventListener("message", event => {
        let data = JSON.parse(event.data);

        // if(data.type == "REDIRECT" && data.data == "PINCODE") {
        //     deactivate_page("#scan-card-page");
        //     activate_page("#pincode-page");

        //     CLIENT_STATE = "PINCODE";
        // }

        if(data.type == "REDIRECT") {
            switch(data.data) {
                case "SCAN_CARD":
                    deactivate_page("#pincode-page");
                    deactivate_page("#options-page");
                    activate_page("#scan-card-page");
                    CLIENT_STATE="SCAN_CARD";
                    break;
                case "PINCODE":
                    deactivate_page("#scan-card-page");
                    activate_page("#pincode-page");
                    CLIENT_STATE = "PINCODE";
                    break;
                case "OPTIONS":
                    if(CLIENT_STATE == "PINCODE") {
                        CLIENT_STATE = "OPTIONS";
                        document.querySelector("#pincode-placeholder").value = "";
                        deactivate_page("#pincode-page");
                        activate_page("#options-page");
                    }
                    break;
            }
        } else if(data.type == "ERROR") {
            switch(data.data) {
                case "SCAN_CARD_NOT_EXIST":
                    Swal.fire({
                        title: "Invalid card",
                        text: "Your card is not registered in the database!",
                        icon: "error"
                    });
                    break;
                case "PINCODE_INCORRECT":
                Swal.fire({
                    title: "Incorrect pincode",
                    text: "Your pincode is incorrect",
                    icon: "error"
                });
                document.querySelector("#pincode-placeholder").value = "";    
                break;
            }
        }

        if(data.type == "PINCODE" && CLIENT_STATE == "PINCODE") {
            let pincodePlaceholder = document.querySelector("#pincode-placeholder");
            if(data.data == "#") {
                let currentValue = pincodePlaceholder.value;
                pincodePlaceholder.value = currentValue.substring(0, currentValue.length - 1);
            } else {
                pincodePlaceholder.value = pincodePlaceholder.value + data.data.toString();
            }
        }

    })

    // OPTIONS

    document.querySelector("#uitloggen").addEventListener('click', () => {
        socket.send("UITLOGGEN");
    });

    socket.addEventListener("open", event => {
        socket.send("Hey, Server!");
    });
});

function activate_page(id) {
    document.querySelector(id).classList.add("active");
}

function deactivate_page(id) {
    document.querySelector(id).classList.remove("active");
}