/* @refresh reload */
import "solid-devtools";
import { render } from "solid-js/web";
import "./styles/fonts.css";
import App from "./App";

render(() => <App />, document.getElementById("root") as HTMLElement);
