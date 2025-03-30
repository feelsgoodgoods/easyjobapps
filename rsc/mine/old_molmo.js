if (window.molmo) {
    let input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Enter prompt'
    input.style = inputStyle
    input.id = 'easyjobapps-input'
  
    let button2 = document.createElement('button')
    button2.id = 'molmo-button'
    button2.innerHTML = 'Process Image'
    button2.style = buttonStyle
    button2.addEventListener('click', window.processImage)
    container.appendChild(input)
    container.appendChild(button2)
  }