document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const output = document.getElementById('output');
    const downloadReports = document.getElementById('downloadReports');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none'; // Hide the file input

    let csvData = null;
    let attendanceCSVContent = '';
    let outreachCSVContent = '';

    // Add the file input to the document
    document.body.appendChild(fileInput);

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
        handleFile(event.dataTransfer.files[0]);
    });

    dropZone.addEventListener('click', () => {
        fileInput.click(); // Trigger file input when dropZone is clicked
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        // Disable the download button and erase the previous output
        downloadReports.disabled = true;
        output.innerHTML = "";
        
        if (file && file.type === 'text/csv') {
            const reader = new FileReader();

            reader.onload = (e) => {
                const text = e.target.result;
                csvData = parseCSV(text); // Store the parsed data for later use
                displayFilteredCSV(csvData);
                const { csvContent: attendanceContent, lastDate } = generateAttendanceCSVContent(csvData);
                const { csvRows: outreachRows } = generateFilteredCSVContent(csvData);
                attendanceCSVContent = attendanceContent;
                outreachCSVContent = outreachRows.map(row => row.join(',')).join('\n');
                downloadReports.disabled = false;
            };

            reader.readAsText(file);
        } else {
            alert('Please upload a valid CSV file.');
        }
    }

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

            // Initialize the person object
            let person = {
                firstName,
                lastName,
                memberType: "N/A", // Default memberType
                beenThroughProcess: false, // Default beenThroughProcess
                action: "", // Default action
                dates: {} // Initialize dates object
            };

            // Track added dates to avoid duplicates and manage weeksAbsent
            const addedDates = new Set();
            let weeksAbsent = 99; // Start at 99 if there has never been a value
            let seenAtLeastOnce = false; // Flag to track if the person has been seen

            // Fill in unique date data
            dateHeaders.forEach((dateHeader, index) => {
                let dateValue = values[index + 3]; // Dates start from index 3
                let parsedDate = parseDate(dateHeader);

                if (parsedDate && isSunday(parsedDate) && !addedDates.has(dateHeader)) {
                    // If there's a value, reset weeksAbsent to 0 and set seenAtLeastOnce to true
                    if (dateValue) {
                        weeksAbsent = 0;
                        seenAtLeastOnce = true;

                        // Determine the memberType based on the last non-absent week
                        if (dateValue === "attended as member") {
                            person.memberType = "Member";
                        } else if (dateValue === "attended as visitor") {
                            person.memberType = "Visitor";
                        } else if (dateValue === "attended as leader") {
                            person.memberType = "Leader";
                        }
                    } else {
                        if (weeksAbsent !== 99) { // If it wasn't already 99, increment it
                            weeksAbsent++;
                        }
                    }

                    // Set beenThroughProcess to true if seenAtLeastOnce is true and weeksAbsent is greater than 5
                    if (seenAtLeastOnce && weeksAbsent > 5) {
                        person.beenThroughProcess = true;
                    }

                    // Add the date and weeksAbsent to the person object
                    person.dates[dateHeader] = weeksAbsent;

                    addedDates.add(dateHeader); // Mark date as added
                }
            });

            // Set action based on the last entry in the dates object
            const dateEntries = Object.entries(person.dates);
            if (dateEntries.length > 0) {
                const lastWeeksAbsent = dateEntries[dateEntries.length - 1][1];
                if (lastWeeksAbsent === 2) {
                    person.action = "Text";
                } else if (lastWeeksAbsent === 3) {
                    person.action = "Post Card";
                } else if (lastWeeksAbsent === 4) {
                    person.action = "Phone Call";
                } else if (lastWeeksAbsent === 5) {
                    person.action = "Visit";
                }
            }

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

    function getLastDate(data) {
        // Get the last date from the first person’s dates object
        if (data.length > 0) {
            const firstPersonDates = data[0].dates;
            const dateKeys = Object.keys(firstPersonDates);
            const lastDate = dateKeys.length > 0 ? dateKeys[dateKeys.length - 1] : "";
            // Replace "/" with "-" in the last date
            return lastDate.replace(/\//g, '-');
        }
        return "";
    }

    function generateFilteredCSVContent(data) {
        const lastDate = getLastDate(data);
        
        // Filter data: persons with beenThroughProcess set to false and action not blank
        const filteredData = data.filter(person => !person.beenThroughProcess && person.action !== "");
    
        // Sort filtered data by last name
        filteredData.sort((a, b) => {
            const lastNameA = a.lastName.toLowerCase();
            const lastNameB = b.lastName.toLowerCase();
            
            if (lastNameA < lastNameB) {
                return -1;
            }
            if (lastNameA > lastNameB) {
                return 1;
            }
            return 0;
        });
    
        // Create CSV header
        const headerRow = ["First Name", "Last Name", "Member Type", "Action"];
    
        // Create CSV rows
        const csvRows = [headerRow];
        filteredData.forEach(person => {
            const row = [
                person.firstName,
                person.lastName,
                person.memberType,
                person.action
            ];
            csvRows.push(row);
        });
    
        return { csvRows, lastDate };
    }

    function generateAttendanceCSVContent(data) {
        // Sort the data by the last absentWeeks value
        data.sort((a, b) => {
            const lastAbsentWeeksA = getLastAbsentWeeks(a.dates);
            const lastAbsentWeeksB = getLastAbsentWeeks(b.dates);
            return lastAbsentWeeksB - lastAbsentWeeksA; // Sort in descending order
        });
    
        const lastDate = getLastDate(data);
        // Create CSV header
        const headers = ["First Name", "Last Name", "Member Type", "Through Process", "Action"];
        // Collect all unique date headers in the order they are encountered
        const dateHeaders = [];
        const dateHeaderSet = new Set(); // To check for duplicates
    
        data.forEach(person => {
            Object.keys(person.dates).forEach(date => {
                if (!dateHeaderSet.has(date)) {
                    dateHeaderSet.add(date);
                    dateHeaders.push(date);
                }
            });
        });
    
        // Create CSV header row
        const headerRow = [...headers, ...dateHeaders].join(',');
    
        // Create CSV rows
        const csvRows = [headerRow];
        data.forEach(person => {
            const row = [
                person.firstName,
                person.lastName,
                person.memberType,
                person.beenThroughProcess,
                person.action,
                ...dateHeaders.map(date => person.dates[date] !== undefined ? person.dates[date] : "0")
            ].join(',');
            csvRows.push(row);
        });
    
        // Create CSV content
        const csvContent = csvRows.join('\n');
    
        return { csvContent, lastDate };
    }
    
    // Helper function to get the last absentWeeks value from a person's dates object
    function getLastAbsentWeeks(dates) {
        const dateEntries = Object.entries(dates);
        if (dateEntries.length > 0) {
            return dateEntries[dateEntries.length - 1][1];
        }
        return 99; // Default to 99 if no dates are present
    }

    function displayFilteredCSV(data) {
        const { csvRows } = generateFilteredCSVContent(data);
    
        // Display CSV content as a table
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRowElement = document.createElement('tr');
        const th = document.createElement('th'); // Empty header for checkboxes
        headerRowElement.appendChild(th);
        csvRows[0].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.border = '1px solid #ddd';
            th.style.padding = '8px';
            th.style.textAlign = 'left';
            headerRowElement.appendChild(th);
        });
        thead.appendChild(headerRowElement);
        table.appendChild(thead);
    
        // Create table body
        const tbody = document.createElement('tbody');
        csvRows.slice(1).forEach(row => {
            const tr = document.createElement('tr');
    
            // Create and add checkbox cell
            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.marginRight = '8px'; // Add some margin for visual separation
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    tr.style.textDecoration = 'line-through';
                } else {
                    tr.style.textDecoration = 'none';
                }
            });
            checkboxCell.appendChild(checkbox);
            tr.appendChild(checkboxCell);
    
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                td.style.border = '1px solid #ddd';
                td.style.padding = '8px';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
    
        // Clear previous output and append the table
        output.innerHTML = '';
        output.appendChild(table);
    
        // Enable and set up download button
        downloadReports.disabled = false;
    
        downloadReports.onclick = () => {
            // Download Attendance CSV
            const blobAttendance = new Blob([attendanceCSVContent], { type: 'text/csv;charset=utf-8;' });
            const urlAttendance = URL.createObjectURL(blobAttendance);
            const aAttendance = document.createElement('a');
            aAttendance.href = urlAttendance;
            aAttendance.download = `attendance_${getLastDate(csvData)}.csv`;
            document.body.appendChild(aAttendance);
            aAttendance.click();
            document.body.removeChild(aAttendance);
    
            // Download Outreach CSV
            const blobOutreach = new Blob([outreachCSVContent], { type: 'text/csv;charset=utf-8;' });
            const urlOutreach = URL.createObjectURL(blobOutreach);
            const aOutreach = document.createElement('a');
            aOutreach.href = urlOutreach;
            aOutreach.download = `outreach_${getLastDate(csvData)}.csv`;
            document.body.appendChild(aOutreach);
            aOutreach.click();
            document.body.removeChild(aOutreach);
        };
    }
});
