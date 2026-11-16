export const EXAMPLES = [
  {
    id: 'classic',
    name: '1. Classic Loupe (Event + Timeouts)',
    description: 'The iconic example from Philip Roberts\' talk showing DOM events, web API timers, and call stack.',
    code: `$.on('button', 'click', function onClick() {
    setTimeout(function timer() {
        console.log('You clicked the button!');    
    }, 2000);
});

console.log("Hi!");

setTimeout(function timeout() {
    console.log("Click the button!");
}, 5000);

console.log("Welcome to loupe.");`,
    html: `<button id="btn">Click me!</button>`
  },
  {
    id: 'callstack',
    name: '2. Call Stack (Nested Functions)',
    description: 'Demonstrates LIFO (Last-In-First-Out) execution order through nested function calls.',
    code: `function multiply(a, b) {
    return a * b;
}

function square(n) {
    return multiply(n, n);
}

function printSquare(n) {
    var s = square(n);
    console.log("Square is: " + s);
}

printSquare(4);`,
    html: `<div class="info-tag">Inspect Call Stack above</div>`
  },
  {
    id: 'zero_delay',
    name: '3. Zero Delay setTimeout(..., 0)',
    description: 'Proves why setTimeout with 0ms still runs AFTER synchronous execution finishes.',
    code: `console.log('1. First');

setTimeout(function zeroTimer() {
    console.log('2. Inside setTimeout 0');
}, 0);

console.log('3. Last');`,
    html: `<div>Observe how the zero timer waits in Callback Queue until the Call Stack clears!</div>`
  },
  {
    id: 'multiple_timeouts',
    name: '4. Multiple Timers Race',
    description: 'Shows multiple Web API timers counting down concurrently and entering queue upon completion.',
    code: `setTimeout(function fast() {
    console.log("Fast (1000ms) finished");
}, 1000);

setTimeout(function slow() {
    console.log("Slow (3000ms) finished");
}, 3000);

setTimeout(function immediate() {
    console.log("Immediate (0ms) finished");
}, 0);

console.log("All timers scheduled!");`,
    html: `<div>Multiple timers active in Web APIs</div>`
  },
  {
    id: 'loop_closure',
    name: '5. Loop with Timers',
    description: 'Scheduling sequential timers in a loop.',
    code: `for (var i = 1; i <= 3; i++) {
    (function(index) {
        setTimeout(function timer() {
            console.log("Tick: " + index);
        }, index * 1000);
    })(i);
}

console.log("Loop finished scheduling");`,
    html: `<div>3 timers scheduled</div>`
  },
  {
    id: 'blocking',
    name: '6. Blocking the Event Loop',
    description: 'Shows how long synchronous code prevents queued callbacks and renders from executing.',
    code: `setTimeout(function waitingCallback() {
    console.log("Finally made it out of the queue!");
}, 0);

console.log("Starting heavy computation...");

var sum = 0;
for (var i = 0; i < 20; i++) {
    sum += i;
}

console.log("Computation done, sum: " + sum);`,
    html: `<div class="warning-tag">Check "Simulate Renders" in top bar!</div>`
  }
];
