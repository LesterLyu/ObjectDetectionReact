import React from "react";
import ReactDOM from "react-dom";

import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import "./styles.css";

class App extends React.Component {
    videoRef = React.createRef();
    canvasRef = React.createRef();
    state = {info: 'loading model, please wait...'};
    stop = false;
    front = true;

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        cocoSsd.load().then(model => {
            this.model = model;
            this.start();
        });
    }

    start() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia({
                    audio: false,
                    video: {
                        facingMode: this.front ? "user" : "environment",
                        width: {ideal: 1920},
                        height: {ideal: 1440},
                    }
                })
                .then(stream => {
                    this.setState({info: 'success get stream'});
                    window.stream = stream;
                    this.videoRef.current.srcObject = stream;
                    return new Promise((resolve, reject) => {
                        this.videoRef.current.onloadedmetadata = () => {
                            resolve();
                        };
                    });
                })
                .then(() => {
                    this.stop = false;
                    this.detectFrame(this.videoRef.current, this.model);
                })
                .catch(error => {
                    this.setState({info: error.message});
                    console.log(error.message);
                });
        }
    }

    detectFrame = (video, model) => {
        if (this.stop)
            return;
        model.detect(video).then(predictions => {
            this.renderPredictions(predictions);
            requestAnimationFrame(() => {
                this.detectFrame(video, model);
            });
        });
    };

    renderPredictions = predictions => {
        const ctx = this.canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        // Font options.
        const font = "16px sans-serif";
        ctx.font = font;
        ctx.textBaseline = "top";
        predictions.forEach(prediction => {
            const x = prediction.bbox[0];
            const y = prediction.bbox[1];
            const width = prediction.bbox[2];
            const height = prediction.bbox[3];
            // Draw the bounding box.
            ctx.strokeStyle = "#00FFFF";
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, width, height);
            // Draw the label background.
            ctx.fillStyle = "#00FFFF";
            const textWidth = ctx.measureText(prediction.class).width;
            const textHeight = parseInt(font, 10); // base 10
            ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
        });

        predictions.forEach(prediction => {
            const x = prediction.bbox[0];
            const y = prediction.bbox[1];
            // Draw the text last to ensure it's on top.
            ctx.fillStyle = "#000000";
            ctx.fillText(prediction.class, x, y);
        });
    };

    switchCamera = () => {
        this.stop = true;
        if (window.stream) {
            window.stream.getTracks().forEach(t => {
                t.stop();
            })
        }
        this.front = ! this.front;
        console.log(this.front);
        this.start();
    };

    render() {
        return (
            <div>
                <h4 style={{display: this.state.info.length ? 'show' : 'none'}}>{this.state.info}</h4>
                <video
                    className="size"
                    autoPlay
                    playsInline
                    muted
                    ref={this.videoRef}
                    width={window.innerWidth}
                    height={window.innerWidth / 3 * 4}
                />
                <canvas
                    className="size"
                    ref={this.canvasRef}
                    width={window.innerWidth}
                    height={window.innerWidth / 3 * 4}
                />
                <button style={{position: 'fixed', top: window.innerWidth / 3 * 4, height: 40}}
                        type="button" onClick={this.switchCamera}>Switch Camera
                </button>
            </div>
        );
    }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App/>, rootElement);
