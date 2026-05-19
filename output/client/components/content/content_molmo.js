// Function to capture the DOM content using html2canvas
function captureDOMToImage() {
    return new Promise((resolve, reject) => {
        // Hide the elements
        const hiddenElements = [];
        const hideElement = (element) => {
            if (element) {
                hiddenElements.push({ element, originalDisplay: element.style.display });
                element.style.display = 'none';
            }
        };

        hideElement(document.getElementById('easyjobapps-container'));

        document.querySelectorAll('.point-circle').forEach((element) => {
            hideElement(element);
        });

        // Capture the canvas
        const targetElement = document.body; // Capture the entire body or any specific element
        html2canvas(targetElement, {
            logging: true, // Set to false to disable console logs from html2canvas
            useCORS: true  // Enable this if you are loading images or assets from external sources
        }).then(canvas => {
            // Restore hidden elements
            hiddenElements.forEach(({ element, originalDisplay }) => {
                element.style.display = originalDisplay;
            });

            // Get the visible dimensions of the viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Create a cropped canvas
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = viewportWidth;
            croppedCanvas.height = viewportHeight;

            const ctx = croppedCanvas.getContext('2d');

            // Draw the visible portion of the original canvas onto the cropped canvas
            ctx.drawImage(canvas, 0, 0, viewportWidth, viewportHeight, 0, 0, viewportWidth, viewportHeight);

            // Convert the cropped canvas to a data URL
            let dataUrl = croppedCanvas.toDataURL('image/png');
            resolve(dataUrl);
        }).catch(error => {
            // Restore hidden elements in case of an error
            hiddenElements.forEach(({ element, originalDisplay }) => {
                element.style.display = originalDisplay;
            });

            reject(new Error('Failed to capture DOM image: ' + error));
        });
    });
}

  
  
// Function to display the captured image on the DOM
function displayCapturedImage(imageDataUrl) {
    let imgElement = document.createElement('img');
    imgElement.src = imageDataUrl;
    imgElement.alt = "Captured DOM Image";
    imgElement.style = "border: 2px solid red; max-width: 100%; margin-top: 20px;"; // Add some styling to make it visible

    // Append the image to the body for display
    document.body.appendChild(imgElement);
}

// Function to process the image
async function processImage() {
    try {
        // Capture the DOM portion as an image
        const domImage = await captureDOMToImage();

        // Display the captured image on the DOM for verification
        displayCapturedImage(domImage);

        // Get the prompt from the input field
        const prompt = document.getElementById('easyjobapps-input').value || 'Default prompt';

        // Send the image and prompt to the service worker
        chrome.runtime.sendMessage(
            { action: 'processImage', screenshot: domImage, prompt },
            (response) => {
                console.log('Response received:', response);
                if (chrome.runtime.lastError) {
                    console.error('Error:', chrome.runtime.lastError.message);
                    return;
                }
                if (response.error) {
                    console.error('Processing error:', response.error);
                } else if (response.result) {
                    handleFinalResult(response.result);
                }
            }
        );
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

// Function to handle the final result
function handleFinalResult(result) { 
    const points = parsePoints(result);
    if (points.length > 0) {
        displayPointsOnPage(points);
    }
}

// Function to parse points from the result dynamically
function parsePoints(result) {
    let points = [];

    // Handle single point case
    const singlePointRegex = /<point x="([\d.]+)" y="([\d.]+)" alt=".*?">.*?<\/point>/g;
    let singleMatch;
    while ((singleMatch = singlePointRegex.exec(result)) !== null) {
        const x = parseFloat(singleMatch[1]);
        const y = parseFloat(singleMatch[2]);
        points.push({ x, y });
    }

    // Handle multiple points case dynamically
    const multiplePointsRegex = /<points[^>]+>/g;
    let multipleMatch;
    while ((multipleMatch = multiplePointsRegex.exec(result)) !== null) {
        // Extract all x and y attributes dynamically
        const pointAttrsRegex = /x\d+="([\d.]+)"\s+y\d+="([\d.]+)"/g;
        let pointMatch;
        while ((pointMatch = pointAttrsRegex.exec(multipleMatch[0])) !== null) {
            const x = parseFloat(pointMatch[1]);
            const y = parseFloat(pointMatch[2]);
            points.push({ x, y });
        }
    }

    return points;
}

// Function to display points on the page
function displayPointsOnPage(points) {
    points.forEach(point => {
        const circle = document.createElement('div');
        circle.className = 'point-circle';
        circle.style.position = 'fixed';
        circle.style.left = `calc(${point.x}% - 10px)`;
        circle.style.top = `calc(${point.y}% - 10px)`;
        circle.style.width = '20px';
        circle.style.height = '20px';
        circle.style.backgroundColor = 'red';
        circle.style.borderRadius = '50%';
        circle.style.zIndex = '1000000';
        document.body.appendChild(circle);
    });
}