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
                case "PINCODE":
                    deactivate_page("#scan-card-page");
                    activate_page("#pincode-page");
                    CLIENT_STATE = "PINCODE";
                    break;
                case "OPTIONS":
                    CLIENT_STATE = "OPTIONS";
                    console.log("OPTIONS");
                    break;
            }
        }

        if(data.type == "PINCODE" && CLIENT_STATE == "PINCODE") {
            let pincodePlaceholder = document.querySelector("#pincode-placeholder");
            pincodePlaceholder.value = pincodePlaceholder.value + data.data.toString();
        }

    })

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