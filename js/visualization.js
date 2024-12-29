// Set up SVG dimensions and margins
const width = 1000;
const height = 600;
const margin = { top: 40, right: 40, bottom: 60, left: 80 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Replace these URLs with the raw GitHub URLs
const matrixUrl = 'https://raw.githubusercontent.com/ogreowl/d3_repo_2/main/top_150_matrix.csv';
const authorsUrl = 'https://raw.githubusercontent.com/ogreowl/d3_repo_2/main/authors.csv';

// Load both CSV files using Promise.all
Promise.all([
    d3.csv(matrixUrl),
    d3.csv(authorsUrl)
]).then(([matrixData, authorsData]) => {
    console.log('Matrix Data:', matrixData);
    console.log('Authors Data:', authorsData);

    // Get philosopher names from matrix columns
    const philosopherNames = Object.keys(matrixData[0]).filter(key => key !== '');
    console.log('Philosopher Names:', philosopherNames);

    // Create philosophers array with birth years from authors.csv
    const philosophers = philosopherNames.map(name => {
        const authorInfo = authorsData.find(author => author.Author === name);
        console.log(`Looking for ${name}:`, authorInfo);
        
        let birthYear = null;
        if (authorInfo) {
            // If birth year exists, use it; otherwise use death year - 50
            birthYear = authorInfo['Birth Year'] ? 
                parseFloat(authorInfo['Birth Year']) : 
                (authorInfo['Death Year'] ? parseFloat(authorInfo['Death Year']) - 50 : null);
        }
        
        return {
            name: name,
            birthYear: birthYear,
            outgoingRefs: 0
        };
    });

    console.log('Philosophers with birth years:', philosophers);

    // Calculate both incoming and outgoing references for each philosopher
    philosophers.forEach((philosopher, index) => {
        // Outgoing references (for y-axis position)
        philosopher.outgoingRefs = matrixData.reduce((sum, row) => {
            if (row[''] === philosopher.name) {
                // Sum all references this philosopher makes to others
                return sum + Object.values(row)
                    .filter((val, i) => i > 0) // Skip the first column (names)
                    .reduce((a, b) => a + (parseInt(b) || 0), 0);
            }
            return sum;
        }, 0);
        
        // Incoming references (for filtering top 30)
        philosopher.incomingRefs = matrixData.reduce((sum, row) => {
            const value = parseInt(row[philosopher.name]) || 0;
            return sum + value;
        }, 0);
    });

    // Sort by incoming references
    philosophers.sort((a, b) => b.incomingRefs - a.incomingRefs);

    // Create two arrays: one for initially visible philosophers and one for all valid philosophers
    const initialPhilosophers = philosophers.slice(0, 10);
    const validPhilosophers = philosophers.filter(p => p.birthYear !== null);

    console.log('All philosophers:', philosophers);
    console.log('Top 30:', initialPhilosophers);
    console.log('Valid philosophers:', validPhilosophers);

    // Create checkbox controls
    const controls = d3.select('body')
        .append('div')
        .attr('class', 'controls')
        .style('position', 'absolute')
        .style('right', '40px')
        .style('top', '40px')
        .style('max-height', '80vh')
        .style('overflow-y', 'auto')
        .style('background', 'white')
        .style('padding', '10px')
        .style('border', '1px solid #ccc')
        .style('box-shadow', '0 2px 5px rgba(0,0,0,0.1)')
        .style('z-index', '1000');

    // Add reference threshold slider with default value of 20
    const sliderContainer = controls.append('div')
        .style('margin-bottom', '15px')
        .style('padding', '10px')
        .style('border-bottom', '1px solid #ccc');

    sliderContainer.append('label')
        .text('Minimum References: ')
        .style('display', 'block')
        .style('margin-bottom', '5px');

    const thresholdValue = sliderContainer.append('span')
        .text('20');  // Set initial display value

    sliderContainer.append('input')
        .attr('type', 'range')
        .attr('min', 0)
        .attr('max', 40)
        .attr('value', 20)  // Set default value to 20
        .style('width', '100%')
        .on('input', function() {
            thresholdValue.text(this.value);
            updateVisibility();
        });

    // Add philosopher checkboxes with debug logging
    console.log('Creating controls for philosophers:', validPhilosophers);
    
    controls.selectAll('div.philosopher-control')
        .data(validPhilosophers)
        .enter()
        .append('div')
        .attr('class', 'philosopher-control')
        .style('margin', '5px')
        .each(function(d, i) {
            console.log('Creating control for:', d.name);
            const div = d3.select(this);
            div.append('input')
                .attr('type', 'checkbox')
                .attr('id', d => d.name)
                .attr('checked', initialPhilosophers.includes(d) ? true : null)
                .on('change', updateVisibility);
            div.append('label')
                .attr('for', d => d.name)
                .style('margin-left', '5px')
                .text(d => d.name);
        });

    // After creating controls, verify all checkboxes
    console.log('Created checkboxes:', 
        Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .map(cb => cb.id)
    );

    // Function to update visibility and recalculate references
    function updateVisibility() {
        const checkedPhilosophers = new Set(
            Array.from(document.querySelectorAll('input:checked'))
                .map(checkbox => checkbox.id)
        );
        
        console.log('Currently checked philosophers:', Array.from(checkedPhilosophers));

        // Filter to only checked philosophers
        const activePhilosophers = validPhilosophers.filter(p => 
            checkedPhilosophers.has(p.name)
        );

        console.log('Active philosophers after filtering:', 
            activePhilosophers.map(p => p.name));

        // Debug Plato specifically
        const platoActive = activePhilosophers.find(p => p.name === 'Plato');
        console.log('Plato status:', {
            inChecked: checkedPhilosophers.has('Plato'),
            inActive: !!platoActive,
            data: platoActive
        });

        // Recalculate references considering only checked philosophers
        activePhilosophers.forEach(philosopher => {
            if (philosopher.name === 'Plato') {
                console.log('Recalculating Plato references...');
                console.log('Before:', {
                    outgoing: philosopher.outgoingRefs,
                    incoming: philosopher.incomingRefs
                });
            }

            // Outgoing references (for y-axis position)
            philosopher.outgoingRefs = matrixData.reduce((sum, row) => {
                if (row[''] === philosopher.name && checkedPhilosophers.has(row[''])) {
                    // Only count references to checked philosophers
                    return sum + Array.from(checkedPhilosophers)
                        .map(name => parseInt(row[name]) || 0)
                        .reduce((a, b) => a + b, 0);
                }
                return sum;
            }, 0);

            // Incoming references (for bubble size)
            philosopher.incomingRefs = matrixData.reduce((sum, row) => {
                if (checkedPhilosophers.has(row[''])) {
                    return sum + (parseInt(row[philosopher.name]) || 0);
                }
                return sum;
            }, 0);

            if (philosopher.name === 'Plato') {
                console.log('After:', {
                    outgoing: philosopher.outgoingRefs,
                    incoming: philosopher.incomingRefs
                });
            }
        });

        // Update both x and y scales with new domains
        xScale.domain(d3.extent(activePhilosophers, d => d.birthYear)).nice();
        yScale.domain([0, d3.max(activePhilosophers, d => d.outgoingRefs)]).nice();

        // Update x-axis with animation
        g.select('.x-axis')
            .transition()
            .duration(500)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => Math.abs(d) + (d < 0 ? ' BCE' : ' CE')));

        // Update y-axis with animation
        g.select('.y-axis')
            .transition()
            .duration(500)
            .call(d3.axisLeft(yScale));

        // Update both x and y grid lines
        g.select('.grid.x')
            .transition()
            .duration(500)
            .call(d3.axisBottom(xScale)
                .tickSize(-innerHeight)
                .tickFormat(''));

        g.select('.grid.y')
            .transition()
            .duration(500)
            .call(d3.axisLeft(yScale)
                .tickSize(-innerWidth)
                .tickFormat(''));

        // Update points with animation
        g.selectAll('.point-group')
            .style('display', d => 
                checkedPhilosophers.has(d.name) ? null : 'none'
            )
            .transition()
            .duration(500)
            .attr('transform', d => `translate(${xScale(d.birthYear)},${yScale(d.outgoingRefs)})`);

        // Update bubbles size
        g.selectAll('.point-group circle:first-child')
            .transition()
            .duration(500)
            .attr('r', d => Math.pow(d.incomingRefs, 1/3) * 4);

        // Update labels
        g.selectAll('.label')
            .style('display', d => 
                checkedPhilosophers.has(d.name) ? null : 'none'
            )
            .transition()
            .duration(500)
            .attr('x', d => xScale(d.birthYear))
            .attr('y', d => yScale(d.outgoingRefs) - 8);

        // Update links
        updateLinks();
    }

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
        .attr('class', 'grid x')
        .attr('transform', `translate(0, ${innerHeight})`)
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.2)
        .call(d3.axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(''));

    g.append('g')
        .attr('class', 'grid y')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.2)
        .call(d3.axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(''));

    // Add axes (only once)
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => Math.abs(d) + (d < 0 ? ' BCE' : ' CE')));

    g.append('g')
        .attr('class', 'y-axis')
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

    // Add arrow marker definition to SVG
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'steelblue');

    // Create a group for the links
    const linksGroup = g.append('g')
        .attr('class', 'links')
        .attr('opacity', 0.1);  // Make lines subtle

    function updateLinks() {
        const threshold = parseInt(d3.select('input[type="range"]').property('value'));
        // Create array of links from visible philosophers
        const links = [];
        const checkedPhilosophers = new Set(
            Array.from(document.querySelectorAll('input:checked'))
                .map(checkbox => checkbox.id)
        );

        // First, collect all bidirectional pairs above threshold
        const bidirectionalPairs = new Set();
        matrixData.forEach(row => {
            const source = row[''];
            Object.entries(row).forEach(([target, value]) => {
                if (target !== '' && parseInt(value) >= threshold) {
                    // Check if there's a reference in the opposite direction
                    const targetRow = matrixData.find(r => r[''] === target);
                    if (targetRow && parseInt(targetRow[source]) >= threshold) {
                        // Store the pair in a consistent order
                        const pair = [source, target].sort().join('->');
                        bidirectionalPairs.add(pair);
                    }
                }
            });
        });

        matrixData.forEach(row => {
            const source = row[''];
            if (checkedPhilosophers.has(source)) {
                Object.entries(row).forEach(([target, value]) => {
                    const referenceCount = parseInt(value);
                    if (target !== '' && 
                        checkedPhilosophers.has(target) && 
                        referenceCount >= threshold) {
                        const sourcePhil = validPhilosophers.find(p => p.name === source);
                        const targetPhil = validPhilosophers.find(p => p.name === target);
                        
                        // Check if this is part of a bidirectional pair
                        const pairKey = [source, target].sort().join('->');
                        const isBidirectional = bidirectionalPairs.has(pairKey);
                        
                        // For bidirectional pairs, curve one up and one down
                        const curveDirection = isBidirectional ? 
                            (source < target ? 1 : -1) : 1;
                        
                        links.push({
                            source: sourcePhil,
                            target: targetPhil,
                            value: referenceCount,
                            id: `${source}->${target}`,
                            curveDirection: curveDirection
                        });
                    }
                });
            }
        });

        // Update links with hover effects and arrows
        const linkElements = linksGroup.selectAll('.link')
            .data(links, d => d.id);

        // Remove old links
        linkElements.exit().remove();

        // Add new links with hover tooltip
        const newLinks = linkElements.enter()
            .append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1)
            .attr('marker-end', 'url(#arrowhead)')
            .style('opacity', 0.1);

        // Merge new and existing links
        const allLinks = newLinks.merge(linkElements)
            .attr('d', d => {
                const sourceX = xScale(d.source.birthYear);
                const sourceY = yScale(d.source.outgoingRefs);
                const targetX = xScale(d.target.birthYear);
                const targetY = yScale(d.target.outgoingRefs);
                
                // Create a gentle curve
                const midX = (sourceX + targetX) / 2;
                const midY = (sourceY + targetY) / 2;
                
                // Use curveDirection to determine if curve goes up or down
                const heightMultiplier = 0.2;
                const controlY = midY - (Math.abs(targetX - sourceX) * heightMultiplier * d.curveDirection);
                
                return d3.line().curve(d3.curveNatural)([
                    [sourceX, sourceY],
                    [midX, controlY],
                    [targetX, targetY]
                ]);
            });

        // Add event listeners to all links
        allLinks
            .on('mouseover', function(event, d) {
                // Remove any existing tooltips first
                d3.selectAll('.tooltip').remove();
                
                d3.select(this)
                    .style('opacity', 1)
                    .attr('stroke-width', 2);
                
                // Add tooltip
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'white')
                    .style('padding', '5px')
                    .style('border', '1px solid #ccc')
                    .style('border-radius', '3px')
                    .style('pointer-events', 'none')
                    .style('opacity', 0);

                tooltip.html(`${d.source.name} → ${d.target.name}<br>References: ${d.value}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .transition()
                    .duration(200)
                    .style('opacity', 1);
            })
            .on('mousemove', function(event) {
                d3.select('.tooltip')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('opacity', 0.1)
                    .attr('stroke-width', 1);
                
                d3.selectAll('.tooltip').remove();
            });

        // Remove the linksGroup opacity setting since we're handling opacity per link
        linksGroup.attr('opacity', null);
    }

    // Modify how points are initially added
    const points = g.selectAll('.point-group')
        .data(validPhilosophers)
        .enter()
        .append('g')
        .attr('class', 'point-group')
        .attr('transform', d => `translate(${xScale(d.birthYear)},${yScale(d.outgoingRefs)})`)
        .on('mouseover', function(event, d) {
            // Remove any existing tooltips
            d3.selectAll('.tooltip').remove();
            
            // Highlight the bubble
            d3.select(this).select('circle:first-child')
                .style('opacity', 0.4)
                .style('fill', '#4682b4');  // Darker steelblue
            
            // Add tooltip
            const tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute')
                .style('background', 'white')
                .style('padding', '5px')
                .style('border', '1px solid #ccc')
                .style('border-radius', '3px')
                .style('pointer-events', 'none')
                .style('opacity', 0);

            tooltip.html(`${d.name}<br>Incoming References: ${d.incomingRefs}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .transition()
                .duration(200)
                .style('opacity', 1);
        })
        .on('mousemove', function(event) {
            d3.select('.tooltip')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            // Reset bubble style
            d3.select(this).select('circle:first-child')
                .style('opacity', 0.2)
                .style('fill', 'steelblue');
            
            // Remove tooltip
            d3.selectAll('.tooltip').remove();
        });

    // Add the larger translucent bubble
    points.append('circle')
        .attr('r', d => Math.pow(d.incomingRefs, 1/3) * 4)
        .attr('fill', 'steelblue')
        .attr('opacity', 0.2);

    // Add the smaller solid point
    points.append('circle')
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

    // Initial link creation
    updateLinks();

    // Initial visibility update to show only checked philosophers
    updateVisibility();
    
}).catch(error => {
    console.error('Error loading the CSV files:', error);
});
