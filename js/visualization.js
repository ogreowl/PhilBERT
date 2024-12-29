// Set up SVG dimensions and margins
const width = 1000;
const height = 600;
const margin = { top: 40, right: 40, bottom: 60, left: 80 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Load both CSV files using Promise.all
Promise.all([
    d3.csv('test_matrix.csv'),
    d3.csv('authors.csv')
]).then(([matrixData, authorsData]) => {
    console.log('Matrix Data:', matrixData);
    console.log('Authors Data:', authorsData);

    // Get philosopher names from matrix columns (assuming first row contains names)
    const philosopherNames = Object.keys(matrixData[0]).filter(key => key !== '');
    console.log('Philosopher Names:', philosopherNames);

    // Create philosophers array with birth years from authors.csv
    const philosophers = philosopherNames.map(name => {
        const authorInfo = authorsData.find(author => author.name === name);
        console.log(`Looking for ${name}:`, authorInfo);
        return {
            name: name,
            birthYear: authorInfo ? parseInt(authorInfo.birth_year) : null,
            outgoingRefs: 0
        };
    });

    console.log('Philosophers with birth years:', philosophers);

    // Calculate total outgoing references for each philosopher
    philosophers.forEach((philosopher, index) => {
        philosopher.outgoingRefs = matrixData.reduce((sum, row) => {
            return sum + (parseInt(row[philosopher.name]) || 0);
        }, 0);
    });

    console.log('Philosophers with references:', philosophers);

    // Filter out philosophers with missing birth years
    const validPhilosophers = philosophers.filter(p => p.birthYear !== null);
    console.log('Valid philosophers:', validPhilosophers);

    // Create SVG container
    const svg = d3.select('body')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create chart group
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(validPhilosophers, d => d.birthYear))
        .range([0, innerWidth])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(validPhilosophers, d => d.outgoingRefs)])
        .range([innerHeight, 0])
        .nice();

    // Add grid lines
    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0, ${innerHeight})`)
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.2)
        .call(d3.axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(''));

    g.append('g')
        .attr('class', 'grid')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.2)
        .call(d3.axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(''));

    // Add axes
    g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => Math.abs(d) + (d < 0 ? ' BCE' : ' CE')));

    g.append('g')
        .call(d3.axisLeft(yScale));

    // Add axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .text('Birth Year');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .text('Total Outgoing References');

    // Add data points
    g.selectAll('circle')
        .data(validPhilosophers)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.birthYear))
        .attr('cy', d => yScale(d.outgoingRefs))
        .attr('r', 4)
        .attr('fill', 'steelblue');

    // Add philosopher names as labels
    g.selectAll('text.label')
        .data(validPhilosophers)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => xScale(d.birthYear))
        .attr('y', d => yScale(d.outgoingRefs) - 8)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .text(d => d.name);
}).catch(error => {
    console.error('Error loading the CSV files:', error);
});
