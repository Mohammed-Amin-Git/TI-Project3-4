let CLIENT_STATE = "NULL";

const pages = {
    CONNECT: "#connect-page",
    SCAN_CARD: "#scan-card-page",
    PINCODE: "#pincode-page",
    OPTIONS: "#options-page",
    GET_INFO: "#gegevens-ophalen"
};

// DEBUG
deactivate_page(pages.CONNECT);
deactivate_page(pages.SCAN_CARD);
deactivate_page(pages.PINCODE);
deactivate_page(pages.OPTIONS);
activate_page(pages.GET_INFO);

document.querySelector("#start").addEventListener("click", () => {
    deactivate_page(pages.CONNECT)
    activate_page(pages.SCAN_CARD)

    CLIENT_STATE = "SCAN_CARD";

    const socket = new WebSocket("ws://localhost:8080");

    socket.addEventListener("message", event => {
        let data = JSON.parse(event.data);

        // if(data.type == "REDIRECT" && data.data == "PINCODE") {
        //     deactivate_page(pages.SCAN_CARD);
        //     activate_page(pages.PINCODE);

        //     CLIENT_STATE = "PINCODE";
        // }

        if(data.type == "REDIRECT") {
            switch(data.data) {
                case "SCAN_CARD":
                    deactivate_page(pages.PINCODE);
                    deactivate_page(pages.OPTIONS);
                    activate_page(pages.SCAN_CARD);
                    CLIENT_STATE="SCAN_CARD";
                    break;
                case "PINCODE":
                    deactivate_page(pages.SCAN_CARD);
                    activate_page(pages.PINCODE);
                    CLIENT_STATE = "PINCODE";
                    break;
                case "OPTIONS":
                    if(CLIENT_STATE == "PINCODE") {
                        document.querySelector("#pincode-placeholder").value = "";
                        deactivate_page(pages.PINCODE);
                        activate_page(pages.OPTIONS);

                        socket.send("USER_DATA");
                        CLIENT_STATE = "OPTIONS";
                    }
                    break;
                case "GET_INFO":
                    deactivate_page(pages.OPTIONS);
                    activate_page(pages.GET_INFO);
                    break;
            }
        } else if(data.type == "ERROR") {
            switch(data.data) {
                case "SCAN_CARD_NOT_EXIST":
                    Swal.fire({
                        title: "Invalid card",
                        text: "Your card is not registered in the database!",
                        icon: "question"
                    });
                    break;
                case "PINCODE_INCORRECT":
                    Swal.fire({
                        title: "Incorrect pincode",
                        text: `${data.count} tries left until you're card will be blocked!`,
                        icon: "warning"
                    });
                    document.querySelector("#pincode-placeholder").value = "";    
                    break;
                case "CARD_BLOCKED":
                    Swal.fire({
                        title: "Card blocked",
                        text: "Contact the helpdesk!",
                        icon: "error"
                    });
            }
        } else if(data.type == "USER_DATA") {
            console.log(data.data);
            document.querySelector("#welcome-message").innerHTML = "Welkom terug, " + data.data;
        } else if(data.type == "GET_INFO") {
            console.log(data);
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

    document.querySelector("#info-btn").addEventListener('click', () => {
        socket.send("GET_INFO");
    });

    // socket.addEventListener("open", event => {
    //     socket.send("Hey, Server!");
    // });
});

function activate_page(id) {
    document.querySelector(id).classList.add("active");
}

function deactivate_page(id) {
    document.querySelector(id).classList.remove("active");
}

// Example fetch function
// async function getApi(path) {
//     const response = await fetch(path, {
//         method: "GET",
//         headers: {
//             "Content-Type": "application/json"
//         }
//     });
//     const result = await response.json();

//     return result;
// }