export function findCashCombinations(amount, bills, vijfEuros, tienEuros, vijftigEuros) {
    // Sort bills array in descending order
    bills.sort((a, b) => b - a);

    // Initialize array to store combinations
    let combinations = new Array(amount + 1).fill(null).map(() => []);
  
    // Base case: there is one way to make amount 0, which is using no bills
    combinations[0] = [[]];
  
    // Loop through each bill denomination
    for (let bill of bills) {
      for (let i = bill; i <= amount; i++) {
        for (let combination of combinations[i - bill]) {
          combinations[i].push([...combination, bill]);
        }
      }
    }
      
    // Check if combination is possible with availble bills
    let cashCombinations = [];
    combinations[amount].forEach(cashCombination => {
        let count5  = countNumber(5, cashCombination);
        let count10 = countNumber(10, cashCombination);
        let count50 = countNumber(50, cashCombination);

        if(count5 <= vijfEuros && count10 <= tienEuros && count50 <= vijftigEuros) {
            cashCombinations.push(cashCombination);
        }
    });

        
    // Return the total combinations and the actual combinations
    return { count: combinations[amount].length, combinations: cashCombinations };
}

export function cashCombinationArrayToString(combination_array) {
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
    output_arr.push(`${numberOf5}x 5`);
  }
  if(numberOf10) {
    output_arr.push(`${numberOf10}x 10`);
  }
  if(numberOf50) {
    output_arr.push(`${numberOf50}x 50`);
  }

  return output_arr.join(" + ");
}

export function obfuscateIBAN(iban) {
  let obfuscated_iban = "";
  for(let i=0; i<iban.length; i++) {
      if(i > 8 && i <= 19) {
        obfuscated_iban += "*";
      } else {
        obfuscated_iban += iban[i];
      }
  }

  return obfuscated_iban;
}

export function countNumber(num, arr) {
  let count = 0;
  arr.forEach(element => {
      if(element == num) {
        count++;
      }
  });
  
  return count;
}

export function formatIBAN(iban) {
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