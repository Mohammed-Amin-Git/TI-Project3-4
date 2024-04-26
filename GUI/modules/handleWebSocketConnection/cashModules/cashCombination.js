export function findCashCombinations(amount, bills) {
    // Sort bills array in descending order
    bills.sort((a, b) => b - a);

    // TODO: Get available bills
    
    // Initialize array to store combinations
    let combinations = new Array(amount + 1).fill(null).map(() => []);
  
    // Base case: there is one way to make amount 0, which is using no bills
    combinations[0] = [[]];
  
    // Loop through each bill denomination
    for (let bill of bills) {
      for (let i = bill; i <= amount; i++) {
        for (let combination of combinations[i - bill]) {
          // TODO: Check if combination is possible with availble bills
          combinations[i].push([...combination, bill]);
        }
      }
    }
  
    // TODO: Check if combination length is 0, then send error back

    // Return the total combinations and the actual combinations
    return { count: combinations[amount].length, combinations: combinations[amount] };
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