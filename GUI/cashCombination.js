export function findCashCombinations(amount, bills) {
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
  
    // Return the total combinations and the actual combinations
    return { count: combinations[amount].length, combinations: combinations[amount] };
}