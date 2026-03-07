document.getElementById('extractButton').addEventListener('click', function () {
    const fileFormat = document.getElementById('file_format').value;
    const fileInput = document.getElementById('file');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please upload a file.');
        return;
    }

    const formData = new FormData();
    formData.append('file_format', fileFormat);
    formData.append('file', file);

    fetch('/extract_from_doc', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        displayExtractedData(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

function displayExtractedData(data) {
    const dataContainer = document.getElementById('dataContainer');
    dataContainer.innerHTML = '';

    if (data.error) {
        dataContainer.textContent = `Error: ${data.error}`;
        return;
    }

    for (const [key, value] of Object.entries(data)) {
        const fieldContainer = document.createElement('div');
        fieldContainer.classList.add('field-container');

        const label = document.createElement('label');
        label.textContent = key;
        fieldContainer.appendChild(label);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        fieldContainer.appendChild(input);

        dataContainer.appendChild(fieldContainer);
    }
}

document.getElementById('submitButton').addEventListener('click', function () {
    document.getElementById('uploadForm').reset();
    document.getElementById('dataContainer').innerHTML = '';
});
