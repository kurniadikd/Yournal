/* @refresh reload */
import "solid-devtools";
import { render } from "solid-js/web";
import "./styles/fonts.css";
import App from "./App";
import { initViewportFix } from "./utils/viewportFix";

// Initialize viewport height tracking for mobile keyboard handling
initViewportFix();
// Suppress non-fatal MapLibre web worker tile parsing errors.
// These originate from null values in vector tile data from openfreemap.org
// and cannot be caught via m.on('error') since they run in a separate worker thread.
window.addEventListener('error', (event) => {
  if (event.message?.includes('Expected value to be of type number, but found null')) {
    event.preventDefault();
    return true;
  }
});

render(() => <App />, document.getElementById("root") as HTMLElement);
