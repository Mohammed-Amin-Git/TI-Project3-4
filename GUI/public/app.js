let CLIENT_STATE = "NULL";

const pages = {
    CONNECT: "#connect-page",
    SCAN_CARD: "#scan-card-page",
    PINCODE: "#pincode-page",
    OPTIONS: "#options-page",
    GET_INFO: "#gegevens-ophalen",
    GELD_OPNEMEN: "#geld-opnemen-page",
    CASH_COMBINATION: "#geld-combinatie-page"
};

// DEBUG MODE
// deactivate_page(pages.CONNECT);
// deactivate_page(pages.SCAN_CARD);
// deactivate_page(pages.PINCODE);
// deactivate_page(pages.OPTIONS);
// activate_page(pages.GET_INFO);

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
                    document.querySelector("#pincode-placeholder").value = "";
                    document.querySelector("#cash-placeholder").value = "€";

                    deactivate_page(pages.PINCODE);
                    deactivate_page(pages.GET_INFO);
                    deactivate_page(pages.GELD_OPNEMEN);
                    activate_page(pages.OPTIONS);

                    socket.send("USER_DATA");
                    CLIENT_STATE = "OPTIONS";
                    break;
                case "GET_INFO":
                    deactivate_page(pages.OPTIONS);
                    activate_page(pages.GET_INFO);
                    CLIENT_STATE = "GET_INFO";
                    break;
                case "GELD_OPNEMEN":
                    document.querySelector("#cash-placeholder").value = "€";
                    console.log("Resetting cash placeholder")

                    deactivate_page(pages.OPTIONS);
                    deactivate_page(pages.CASH_COMBINATION);
                    activate_page(pages.GELD_OPNEMEN);

                    CLIENT_STATE = "GELD_OPNEMEN";
                    break;
                case "CASH_COMBINATION":
                    document.querySelector("#cash-placeholder").innerHTML = "€";

                    deactivate_page(pages.GELD_OPNEMEN);
                    activate_page(pages.CASH_COMBINATION);

                    socket.send("GET_COMBINATIONS");
                    CLIENT_STATE = "CASH_COMBINATION";
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
                    break;
                case "INVALID_CASH_AMOUNT":
                    Swal.fire({
                        title: "Invalid amount",
                        text: "Please enter a cash amount between €5-100",
                        icon: "error"
                    })
                    break;
                case "INVALID_MULTIPLE":
                    Swal.fire({
                        title: "Invalid amount",
                        text: "The specified amount must be a multiple of 5!",
                        icon: "error"
                    })
            }
        } else if(data.type == "USER_DATA" && CLIENT_STATE == "OPTIONS") {
            document.querySelector("#welcome-message").innerHTML = "Welkom terug, " + data.data;
        
        } else if(data.type == "GET_INFO" && CLIENT_STATE == "GET_INFO") {
            document.querySelector("#gegevens-naam").innerHTML = "Naam: " + data.name;
            document.querySelector("#gegevens-iban").innerHTML = "IBAN: " + data.iban;
            document.querySelector("#gegevens-saldo").innerHTML = "Saldo: €" + data.balance;
            document.querySelector("#gegevens-datum").innerHTML = "Gemaakt op: " + data.creation_date.split("T")[0];
        
        } else if(data.type == "PINCODE" && CLIENT_STATE == "PINCODE") {
            let pincodePlaceholder = document.querySelector("#pincode-placeholder");
            if(data.data == "#") {
                let currentValue = pincodePlaceholder.value;
                pincodePlaceholder.value = currentValue.substring(0, currentValue.length - 1);
            } else {
                pincodePlaceholder.value = pincodePlaceholder.value + data.data.toString();
            }

        } else if(data.type == "GELD_INVOEREN" && CLIENT_STATE == "GELD_OPNEMEN") {
            let cashPlaceholder = document.querySelector("#cash-placeholder");
            if(data.data == "#") {
                if(cashPlaceholder.value.length > 1) {
                    let currentValue = cashPlaceholder.value;
                    cashPlaceholder.value = currentValue.substring(0, currentValue.length - 1);
                }
            } else {
                cashPlaceholder.value = cashPlaceholder.value + data.data.toString();
            }

        } else if(data.type == "COMBINATIONS" && CLIENT_STATE == "CASH_COMBINATION") {
            let index = 0;
            for(let btn of document.getElementsByClassName("btn2")) {
                let combination_array = data.data[index];
                let numberOf5 = 0;
                let numberOf10 = 0;
                let numberOf50 = 0;

                for(let i=0; i<combination_array.length;i++) {
                    switch(combination_array[i]) {
                        case 5:
                            numberOf5++;
                            break;
                        case 10:
                            numberOf10++;
                            break;
                        case 50:
                            numberOf50++;
                            break;
                    }
                }

                let output_arr = [];
                if(numberOf5) {
                    output_arr.push(`${numberOf5} x 5`);
                }
                if(numberOf10) {
                    output_arr.push(`${numberOf10} x 10`);
                }
                if(numberOf50) {
                    output_arr.push(`${numberOf50} x 50`);
                }

                btn.innerHTML = output_arr.join(" + ");
                index++;
            }

            document.querySelector("#biljetkeuze").innerHTML = `Biljetkeuze €${data.amount}`;
        }

    })

    // OPTIONS

    document.querySelector("#uitloggen").addEventListener('click', () => {
        socket.send("UITLOGGEN");
    });

    document.querySelector("#info-btn").addEventListener('click', () => {
        socket.send("GET_INFO");
    });

    for(let btn of document.getElementsByClassName("back-button")) {
        btn.addEventListener('click', () => {
            socket.send("BACK");
        });
    }

    document.querySelector("#geld-opnemen-btn").addEventListener('click', () => {
        socket.send("GELD_OPNEMEN");
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