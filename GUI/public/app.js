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
    RECEIPT_WAIT: "#receipt-wait-page",
    SNELPINNEN: "#snelpinnen-page"
};

// DEBUG MODE
//debug(pages.SNELPINNEN);

let global_languages;
let LANGUAGE = 'nl';

setLanguages();

document.querySelector("#start").addEventListener("click", () => {
    deactivate_page(pages.CONNECT)
    activate_page(pages.SCAN_CARD)

    loadLanguage();

    CLIENT_STATE = "SCAN_CARD";

    const socket = new WebSocket("ws://localhost:8080");

    socket.addEventListener("message", event => {
        let data = JSON.parse(event.data);
        console.log(data);

        if(data.type == "REDIRECT") {
            switch(data.data) {
                case "SCAN_CARD":
                    deactivateAllPages();
                    activate_page(pages.SCAN_CARD);
                    document.querySelector("#pincode-placeholder").value = "";
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

                    deactivateAllPages();
                    activate_page(pages.OPTIONS);

                    if(CLIENT_STATE == "TRANSACTION") {
                        document.querySelector("#transaction-container").replaceChildren();
                    }

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
                    deactivate_page(pages.SNELPINNEN);
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
                case "SNELPINNEN":
                    if(CLIENT_STATE == "CASH_COMBINATION") {
                        resetCashCombinationButtons();
                    }

                    deactivate_page(pages.OPTIONS);
                    deactivate_page(pages.CASH_COMBINATION);
                    activate_page(pages.SNELPINNEN);
                    CLIENT_STATE = "SNELPINNEN";
                    break;
            }
        } else if(data.type == "ERROR") {
            switch(data.data) {
                case "SCAN_CARD_NOT_EXIST":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.SCAN_CARD_NOT_EXIST.title,
                        text: global_languages[LANGUAGE].errorMessages.SCAN_CARD_NOT_EXIST.text,
                        icon: "question"
                    });
                    break;
                case "INVALID_CARD":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.INVALID_CARD.title,
                        text: global_languages[LANGUAGE].errorMessages.INVALID_CARD.text,
                        icon: "warning"
                    });
                    break;
                case "PINCODE_INCORRECT":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.PINCODE_INCORRECT.title,
                        text: data.count + global_languages[LANGUAGE].errorMessages.PINCODE_INCORRECT.text,
                        icon: "warning"
                    });
                    document.querySelector("#pincode-placeholder").value = "";    
                    break;
                case "CARD_BLOCKED":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.CARD_BLOCKED.title,
                        text: global_languages[LANGUAGE].errorMessages.CARD_BLOCKED.text,
                        icon: "error"
                    });
                    break;
                case "INVALID_CASH_AMOUNT":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.INVALID_CASH_AMOUNT.title,
                        text: global_languages[LANGUAGE].errorMessages.INVALID_CASH_AMOUNT.text,
                        icon: "error"
                    })
                    break;
                case "INVALID_MULTIPLE":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.INVALID_MULTIPLE.title,
                        text: global_languages[LANGUAGE].errorMessages.INVALID_MULTIPLE.text,
                        icon: "error"
                    })
                    break;
                case "LOW_BALANCE":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.LOW_BALANCE.title,
                        text: global_languages[LANGUAGE].errorMessages.LOW_BALANCE.text,
                        icon: "error"
                    });
                    break;
                case "INVALID_QUICK_PIN":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.INVALID_QUICK_PIN.title,
                        text: global_languages[LANGUAGE].errorMessages.INVALID_QUICK_PIN.text,
                        icon: "error"
                    });
                    break;
                case "SESSION_EXPIRED":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.SESSION_EXPIRED.title,
                        text: global_languages[LANGUAGE].errorMessages.SESSION_EXPIRED.text,
                        icon: "error"
                    });
                    break;
                case "LOW_ATM_BILLS":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.LOW_ATM_BILLS.title,
                        text: global_languages[LANGUAGE].errorMessages.LOW_ATM_BILLS.text,
                        icon: "error"
                    });
                    break;
                case "NOOB_TRANSACTION":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.NOOB_TRANSACTION.title,
                        text: global_languages[LANGUAGE].errorMessages.NOOB_TRANSACTION.text,
                        icon: "info"
                    });
                    break;
                case "DAILY_LIMIT":
                    Swal.fire({
                        title: global_languages[LANGUAGE].errorMessages.DAILY_LIMIT.title,
                        text: global_languages[LANGUAGE].errorMessages.DAILY_LIMIT.text,
                        icon: "error"
                    });
            }
        } else if(data.type == "SUCCESS") {
            switch(data.data) {
                case "TRANSACTION_SUCCESS":
                    Swal.fire({
                        title: global_languages[LANGUAGE].successMessages.TRANSACTION_SUCCESS.title,
                        text: global_languages[LANGUAGE].successMessages.TRANSACTION_SUCCESS.text,
                        icon: "success"
                    })
                    break;
            }
        } else if(data.type == "USER_DATA" && CLIENT_STATE == "OPTIONS") {
            document.querySelector("#welcome-message").innerHTML = global_languages[LANGUAGE].welcomeBackMessage + data.data;
        
        } else if(data.type == "GET_INFO") {
            console.log("Just received my GET_INFO data!");
            document.querySelector("#gegevens-id").innerHTML = "ID: " + data.customer_id;
            document.querySelector("#gegevens-naam").innerHTML = global_languages[LANGUAGE].userInfoRows.name + ": " + data.name;
            document.querySelector("#gegevens-iban").innerHTML = "IBAN: " + formatIBAN(data.iban);
            document.querySelector("#gegevens-saldo").innerHTML = global_languages[LANGUAGE].userInfoRows.balance + ": €" + data.balance;

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

            document.querySelector("#gegevens-datum").innerHTML = global_languages[LANGUAGE].userInfoRows.creationDate + " " + formattedDateTime;
        
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
            
            let transactionTitle = document.createElement("h2");
            transactionTitle.style.borderBottom = "solid 1px black";
            transactionTitle.style.paddingBottom = "3px";
            transactionTitle.style.width = "100%";
            transactionTitle.style.marginBottom = 0;
            transactionTitle.style.paddingBottom = "10px";

            transactionTitle.innerHTML = global_languages[LANGUAGE].menuOptions.transactionHistory;
            transactionContainer.appendChild(transactionTitle);
            
            let rowIndex = 0;
            data.transactions.forEach(row => {
                let transactionDiv = document.createElement("div");
                transactionDiv.className = "transaction-div";

                let transactionID = document.createElement("p");
                transactionID.innerHTML = `<b>${global_languages[LANGUAGE].transactionHistory.transactionID}:</b> #${row.Transaction_ID}`;

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
                transactionDate.innerHTML = `<b>${global_languages[LANGUAGE].transactionHistory.date}:</b> ${formattedDateTime}`;

                let transactionAmount = document.createElement("p");
                transactionAmount.innerHTML = `<b>${global_languages[LANGUAGE].transactionHistory.amount}:</b> €${row.Transaction_amount}`;

                transactionDiv.appendChild(transactionID);
                transactionDiv.appendChild(transactionDate);
                transactionDiv.appendChild(transactionAmount);

                transactionContainer.appendChild(transactionDiv);

                if(rowIndex % 2 == 0) {
                    transactionID.style.backgroundColor = "#e3e5ff";
                    transactionDiv.style.backgroundColor = "#e3e5ff";
                }

                rowIndex++;
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

    document.querySelector("#snelpinnen-btn").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SNELPINNEN"
        }));
    });

    // Handle snelpinnen buttons
    document.querySelector("#btn-10-euro").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SELECT_SNELPINNEN",
            "amount": 10
        }));
    });
    document.querySelector("#btn-20-euro").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SELECT_SNELPINNEN",
            "amount": 20
        }));
    });
    document.querySelector("#btn-50-euro").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SELECT_SNELPINNEN",
            "amount": 50
        }));
    });
    document.querySelector("#btn-70-euro").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SELECT_SNELPINNEN",
            "amount": 70
        }));
    });
    document.querySelector("#btn-100-euro").addEventListener('click', () => {
        socket.send(JSON.stringify({
            "type": "SELECT_SNELPINNEN",
            "amount": 100
        }));
    });

    for(let flag of document.getElementsByClassName('flags')) {
        flag.addEventListener('click', () => {
            LANGUAGE = flag.getAttribute('value');
            loadLanguage();
        });
    }
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

function deactivateAllPages() {
    for(const [key, value] of Object.entries(pages)) {
        deactivate_page(value);
    }
}

function resetCashCombinationButtons() {
    for(let btn of document.getElementsByClassName("btn2")) {
        btn.innerHTML = '<i class="fa-solid fa-xmark">';
        btn.disabled = true;
        btn.style.cursor = "not-allowed";
    }
}

function formatIBAN(iban) {
    if(!iban.match(/[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{10}/)) {
        throw new Error("IBAN heeft onjuist formaat!");
    }

    let formatted_iban = "";
    for(let i=0; i<iban.length; i++) {
      formatted_iban += iban[i];
      if((i + 1) % 4 == 0) {
        formatted_iban += " ";
      }
    }

    return formatted_iban;
}

async function setLanguages() {
    const options = {
        method: "GET",
        headers: {
            'Content-Type': "application/json"
        }
    };

    const response = await fetch('/languages/languages.json', options);
    const json = await response.json();

    global_languages = json;
}

async function loadLanguage() {
    document.querySelector("#scan-card-text").innerHTML = global_languages[LANGUAGE].scanCardMessage;
    document.querySelector("#passcode-text").innerHTML = global_languages[LANGUAGE].enterPasscodeMessage;

    document.querySelector("#snelpinnen-btn").innerHTML = global_languages[LANGUAGE].menuOptions.quickPin;
    document.querySelector("#geld-opnemen-btn").innerHTML = global_languages[LANGUAGE].menuOptions.withdraw;
    document.querySelector("#info-btn").innerHTML = global_languages[LANGUAGE].menuOptions.getInfo;
    document.querySelector("#transaction-btn").innerHTML = global_languages[LANGUAGE].menuOptions.transactionHistory;
    document.querySelector("#uitloggen").innerHTML = global_languages[LANGUAGE].menuOptions.logout;

    document.querySelector("#gebruiker-gegevens").innerHTML = global_languages[LANGUAGE].getInfoTitle;
    
    document.querySelector("#geld-invoeren-text").innerHTML = global_languages[LANGUAGE].withdrawMessage;
    document.querySelector("#withdraw-option").innerHTML = global_languages[LANGUAGE].withdrawOption;
    document.querySelector("#biljetkeuze").innerHTML = global_languages[LANGUAGE].billOption;
    document.querySelector("#dispensing-money").innerHTML = global_languages[LANGUAGE].dispensingMoney;
    
    document.querySelector("#receipt-option-title").innerHTML = global_languages[LANGUAGE].receiptOption;
    document.querySelector("#receipt-title").innerHTML = global_languages[LANGUAGE].receiptMessage;

    document.querySelector("#receipt-option-ja").innerHTML = global_languages[LANGUAGE].receiptOptions.yes;
    document.querySelector("#receipt-option-nee").innerHTML = global_languages[LANGUAGE].receiptOptions.no;
}