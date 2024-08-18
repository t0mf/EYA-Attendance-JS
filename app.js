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
        const dateHeaders = headers.slice(3); // Assuming date columns start from index 3

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
                memberType: "N/A", // Default memberType
                dates: []
            };

            // Track added dates to avoid duplicates and weeks absent
            const addedDates = new Set();
            let weeksAbsent = 99; // Start at 99 if there has never been a value

            // Fill in unique date data
            dateHeaders.forEach((dateHeader, index) => {
                let dateValue = values[index + 3]; // Dates start from index 3
                let parsedDate = parseDate(dateHeader);

                if (parsedDate && isSunday(parsedDate) && !addedDates.has(dateHeader)) {
                    // If there's a value, reset weeksAbsent to 0, otherwise increment it
                    if (dateValue) {
                        weeksAbsent = 0;

                        // Determine the memberType based on the last non-absent week
                        if (dateValue === "attended as member") {
                            person.memberType = "member";
                        } else if (dateValue === "attended as visitor") {
                            person.memberType = "visitor";
                        } else if (dateValue === "attended as leader") {
                            person.memberType = "leader";
                        }
                    } else {
                        if (weeksAbsent !== 99) { // If it wasn't already 99, increment it
                            weeksAbsent++;
                        }
                    }

                    person.dates.push({
                        date: dateHeader,
                        value: dateValue || '', // Store empty values as well
                        weeksAbsent: weeksAbsent
                    });

                    addedDates.add(dateHeader); // Mark date as added
                }
            });

            return person;
        });
    }

    function parseDate(dateString) {
        // Assuming dateString is in mm/dd/yyyy format
        let [month, day, year] = dateString.split('/').map(num => parseInt(num, 10));
        // Create and return a new Date object
        return new Date(year, month - 1, day);
    }

    function isSunday(date) {
        return date.getDay() === 0; // 0 represents Sunday
    }

    function displayData(data) {
        output.textContent = JSON.stringify(data, null, 2);
    }
});
