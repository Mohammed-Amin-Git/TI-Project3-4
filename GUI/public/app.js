let CLIENT_STATE = "NULL";

const pages = {
    CONNECT: "#connect-page",
    SCAN_CARD: "#scan-card-page",
    PINCODE: "#pincode-page",
    OPTIONS: "#options-page",
    GET_INFO: "#gegevens-ophalen",
    GELD_OPNEMEN: "#geld-opnemen-page",
    CASH_COMBINATION: "#geld-combinatie-page",
    DISPENSE_WAIT: "#dispense-wait-page",
    RECEIPT_OPTION: "#receipt-option-page",
    TRANSACTION: "#transaction-page",
    RECEIPT_WAIT: "#receipt-wait-page"
};

// DEBUG MODE
//debug(pages.RECEIPT_WAIT);

document.querySelector("#start").addEventListener("click", () => {
    deactivate_page(pages.CONNECT)
    activate_page(pages.SCAN_CARD)

    CLIENT_STATE = "SCAN_CARD";

    const socket = new WebSocket("ws://localhost:8080");

    socket.addEventListener("message", event => {
        let data = JSON.parse(event.data);

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
                    deactivate_page(pages.RECEIPT_OPTION);
                    deactivate_page(pages.TRANSACTION);
                    deactivate_page(pages.RECEIPT_WAIT);
                    activate_page(pages.OPTIONS);

                    if(CLIENT_STATE == "TRANSACTION") {
                        document.querySelector("#transaction-container").replaceChildren();
                    } else if(CLIENT_STATE == "")

                    socket.send(JSON.stringify({
                        "type": "USER_DATA"
                    }));
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

                    if(CLIENT_STATE == "CASH_COMBINATION") {
                        resetCashCombinationButtons();
                    }

                    deactivate_page(pages.OPTIONS);
                    deactivate_page(pages.CASH_COMBINATION);
                    activate_page(pages.GELD_OPNEMEN);

                    CLIENT_STATE = "GELD_OPNEMEN";
                    break;
                case "CASH_COMBINATION":
                    document.querySelector("#cash-placeholder").innerHTML = "€";

                    deactivate_page(pages.GELD_OPNEMEN);
                    activate_page(pages.CASH_COMBINATION);

                    socket.send(JSON.stringify({
                        "type": "GET_COMBINATIONS"
                    }));
                    CLIENT_STATE = "CASH_COMBINATION";
                    break;
                case "RECEIPT_OPTION":
                    deactivate_page(pages.DISPENSE_WAIT);
                    activate_page(pages.RECEIPT_OPTION);

                    CLIENT_STATE = "RECEIPT_OPTION";
                    break;
                case "DISPENSE_WAIT":
                    deactivate_page(pages.CASH_COMBINATION);
                    activate_page(pages.DISPENSE_WAIT);

                    resetCashCombinationButtons();

                    CLIENT_STATE = "DISPENSE_WAIT";
                    break;
                case "TRANSACTION":
                    deactivate_page(pages.OPTIONS);
                    activate_page(pages.TRANSACTION);
                    
                    socket.send(JSON.stringify({
                        "type": "GET_TRANSACTION"
                    }));
                    CLIENT_STATE = "TRANSACTION";
                    break;
                case "RECEIPT_WAIT":
                    deactivate_page(pages.RECEIPT_OPTION);
                    activate_page(pages.RECEIPT_WAIT);
                    CLIENT_STATE = "RECEIPT_WAIT";
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
                    break;
                case "LOW_BALANCE":
                    Swal.fire({
                        title: "Low balance",
                        text: "Your balance is too low for this withdrawal",
                        icon: "error"
                    })
            }
        } else if(data.type == "SUCCESS") {
            switch(data.data) {
                case "DISPENSE_SUCCESS":
                    Swal.fire({
                        title: "Successfully dispensed money",
                        text: "The cash dispensing went succesfully",
                        icon: "success"
                    });
                    break;
            }
        } else if(data.type == "USER_DATA" && CLIENT_STATE == "OPTIONS") {
            document.querySelector("#welcome-message").innerHTML = "Welkom terug, " + data.data;
        
        } else if(data.type == "GET_INFO" && CLIENT_STATE == "GET_INFO") {
            document.querySelector("#gegevens-naam").innerHTML = "Naam: " + data.name;
            document.querySelector("#gegevens-iban").innerHTML = "IBAN: " + data.iban;
            document.querySelector("#gegevens-saldo").innerHTML = "Saldo: €" + data.balance;

            let dateTime = new Date(data.creation_date);
            let formattedDateTime = new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).format(dateTime);

            document.querySelector("#gegevens-datum").innerHTML = "Gemaakt op: " + formattedDateTime;
        
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
            cash_combinations = data.data;

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
                btn.disabled = false;
                btn.style.cursor = "pointer";

                if(index >= data.data.length) {
                    break;
                }
            }

            document.querySelector("#biljetkeuze").innerHTML = `Biljetkeuze €${data.amount}`;
        } else if(data.type == "TRANSACTIONS" && CLIENT_STATE == "TRANSACTION") {
            let transactionContainer = document.querySelector("#transaction-container");
            data.transactions.forEach(row => {
                let transactionDiv = document.createElement("div");
                transactionDiv.className = "transaction-div";

                let transactionID = document.createElement("p");
                transactionID.innerText = `Transcation ID: ${row.Transaction_ID}`;

                let dateTime = new Date(row.Date);
                let formattedDateTime = new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                }).format(dateTime);

                let transactionDate = document.createElement("p");
                transactionDate.innerText = `Date: ${formattedDateTime}`;

                let transactionAmount = document.createElement("p");
                transactionAmount.innerText = `Amount: €${row.Transaction_amount}`;

                transactionDiv.appendChild(transactionID);
                transactionDiv.appendChild(transactionDate);
                transactionDiv.appendChild(transactionAmount);

                transactionContainer.appendChild(transactionDiv);
            });
        }

    })

    // OPTIONS

    document.querySelector("#uitloggen").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "UITLOGGEN"
        }));
    });

    document.querySelector("#info-btn").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "GET_INFO"
        }));
    });

    for(let btn of document.getElementsByClassName("back-button")) {
        btn.addEventListener('click', () => {
            socket.send(JSON.stringify({
                "type": "BACK"
            }));
        });
    }

    document.querySelector("#geld-opnemen-btn").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "GELD_OPNEMEN"
        }));
    });

    document.querySelector("#cash-option1").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SELECT_COMBINATION",
            "number": 0
        }));
    });
    document.querySelector("#cash-option2").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SELECT_COMBINATION",
            "number": 1
        }));
    });
    document.querySelector("#cash-option3").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SELECT_COMBINATION",
            "number": 2
        }));
    });

    document.querySelector("#receipt-option-nee").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "PRINT_RECEIPT",
            "receipt_option": false
        }));
    });
    document.querySelector("#receipt-option-ja").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "PRINT_RECEIPT",
            "receipt_option": true
        }));
    });

    document.querySelector("#transaction-btn").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "TRANSACTION"
        }));
    });
});

function activate_page(id) {
    document.querySelector(id).classList.add("active");
}

function deactivate_page(id) {
    document.querySelector(id).classList.remove("active");
}

function debug(page) {
    for(const [key, value] of Object.entries(pages)) {
        if(value != page) {
            deactivate_page(value);
        } else {
            activate_page(value);
        }
    }
}

function resetCashCombinationButtons() {
    for(let btn of document.getElementsByClassName("btn2")) {
        btn.innerHTML = '<i class="fa-solid fa-xmark">';
        btn.disabled = true;
        btn.style.cursor = "not-allowed";
    }
}