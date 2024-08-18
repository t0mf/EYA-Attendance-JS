document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const output = document.getElementById('output');

    // Prevent default behavior (Prevent file from being opened)
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');

        const file = event.dataTransfer.files[0];
        if (file && file.type === 'text/csv') {
            const reader = new FileReader();

            reader.onload = (e) => {
                const text = e.target.result;
                const data = parseCSV(text);
                displayData(data);
            };

            reader.readAsText(file);
        } else {
            alert('Please drop a CSV file.');
        }
    });

    function parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(header => header.trim());
        const rows = lines.slice(1);

        // Extract date headers
        const dateHeaders = headers.slice(3); // Start from index 3 to get date columns

        return rows.map(row => {
            const values = row.split(',').map(value => value.trim());
            const firstName = values[0] || '';
            const lastName = values[1] || '';
            const percent = values[2] || '';

            // Create an object for each person
            let person = {
                firstName,
                lastName,
                percent,
                dates: []
            };

            // Fill in date data
            dateHeaders.forEach((dateHeader, index) => {
                let dateValue = values[index + 3]; // Dates start from index 3
                person.dates.push({
                    date: dateHeader,
                    value: dateValue || '' // Handle empty values within dates
                });
            });

            return person;
        });
    }

    function displayData(data) {
        output.textContent = JSON.stringify(data, null, 2);
    }
});
