var Stats = require('../faststats').Stats;


var s1 = new Stats().push(22.437, 22.437, 2.437, 22.437, 22.437, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5 );
var s2 = s1.iqr();

console.log(s1.length); // Output 30
console.log(s2.length); // Output 0