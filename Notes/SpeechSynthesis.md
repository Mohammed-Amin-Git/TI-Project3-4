# SpeechSynthesis API

This document contains everything you need to know, to get started in using the Javascript SpeechSynthesis API.

## Abstract

The `SpeechSynthesis` API, is a browser API that allows you to convert plain to text into human-like speech. The API is supported by most browsers and can be used with `Javascript`.

## Creating a SpeechSynthesis Object

```js
const synth = window.speechSynthesis;
```

## List available voices

```js
const voices = speechSynthesis.getVoices();
voices.forEach(voice => {
    console.log(voice); // Logging voice object
});
```

## Generate speech

```js
...

if(synth.speaking) {
    console.error("A voice is already speaking");
    return;
}

const utterThis = new SpeechSynthesisUtterance("sample text");
const firstVoice = speechSynthesis.getVoices()[0]; // Selecting first voice

utterThis.voice = firstVoice;

synth.speak(utterThis);

...
```

In this example we are using the first voice that is available as out voice. Note that you can use the `getVoice()` method , to select a appropiate voice. See [List available device](#list-available-voices).

<br>

## Speak function
Below you see the code for the the speak function which you can use to abstract the SpeechSynthesis method.

```js
function speak(text, voice) {
        if(synth.speaking) {
            console.error("Error: A voice is already speaking!");
            return;
        }

        const utterThis = new SpeechSynthesisUtterance(text);
        utterThis.voice = voice;
        synth.speak(utterThis);
}
```