///////////////////////////////////////////////////
// Force Setup
///////////////////////////////////////////////////

//	data stores
let graph, store;
let filtered = [];

//	svg selection and sizing
let SVG_FORCE = d3.select("svg"),
    width = +SVG_FORCE.attr("width"),
    height = +SVG_FORCE.attr("height"),
    radius = 5;


SVG_FORCE.append("defs").selectAll("marker")
  .data(["suit", "licensing", "resolved"])
  .enter().append("marker")
  .attr("id", function(d) { return d; })
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 28)
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0, -5L10, 0L0, 5 L10, 0 L0, -5")
  .style("stroke", "#CCC")
  .style("opacity", "0.6");


//	d3 color scales
let color = d3.scaleOrdinal()
  .domain(["1", "2", "3", "4"])
  .range([
    chroma("30bd9f"),               // Maker
    chroma("30bd9f"),               // Maker
    "#777",                         // EOA
    chroma('hotpink'),              // WETH
    "rgb(85, 53, 128)",             // Augur
    "rgb(26, 188, 156)",             // Compound
    "rgb(85, 53, 128)",             // DyDx
    "rgb(85, 53, 128)",             // UniSwap
  ]);


let link = SVG_FORCE.append("g").selectAll(".link"),
	  node = SVG_FORCE.append("g").selectAll(".node");

//	force simulation initialization
let simulation = d3.forceSimulation()
	.force("link", d3.forceLink()
		.id(function(d) { return d.id; }))
	.force("charge", d3.forceManyBody()
		.strength(function(d) { return -500;}))
	.force("center", d3.forceCenter(width / 2, height / 2));

//	filtered types
typeFilterList = [];

//	filter button event handlers
$(".filter-btn").on("click", function() {
	let id = $(this).attr("value");
	if (typeFilterList.includes(id)) {
		typeFilterList.splice(typeFilterList.indexOf(id), 1)
	} else {
		typeFilterList.push(id);
	}
	filter();
	update();
});


///////////////////////////////////////////////////
// Slider Setup
///////////////////////////////////////////////////

let margin = {
    top: 20,
    bottom: 110,
  },
  margin2 = {
    top: 30,
    right: 20,
    bottom: 30,
    left: 50
  },
  width2 = 960 - margin2.left - margin2.right,
  height2 = 100 - margin2.top - margin2.bottom;

let parseDate = d3.timeParse("%b %Y");

let xScale2 = d3.scaleTime().range([0, width2]),
    yScale2 = d3.scaleLinear().range([height2, 0]);

let xAxis2 = d3.axisBottom(xScale2);

let SVG_PLOT = d3.select("#plot")
  .append("svg")
    .attr("width", width2 + margin2.left + margin2.right)
    .attr("height", height2 + margin.top + margin.bottom);

let slider = SVG_PLOT.append("g")
  .attr("class", "slider")
  .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");




///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Data read and store
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

d3.json("blocks-data.json", function(err, g) {
	if (err) throw err;

  /////////////////////////////////////////////////////////
  // Create force
  /////////////////////////////////////////////////////////

  g.nodes.forEach(node => {
    node.first_date = parseDate(node.first_date);
    node.last_date = parseDate(node.last_date);
  });

  g.links.forEach(link => {
    link.date = parseDate(link.date);
    link.value = +link.value;
  });

	let nodeByID = {};

	g.nodes.forEach(function(n) {
		nodeByID[n.id] = n;
	});

	g.links.forEach(function(l) {
		l.sourceGroup = nodeByID[l.source].group.toString();
		l.targetGroup = nodeByID[l.target].group.toString();
	});

	graph = g;
	store = $.extend(true, {}, g);

	update();

  /////////////////////////////////////////////////////////
  // create SLIDER
  /////////////////////////////////////////////////////////

  let brush = d3.brushX()
    .extent([[0, 0], [width2, height2]])
    .on("brush end", brushed);

  xScale2.domain(d3.extent(g.links, function (g) {
    return g.date;
  }));

  yScale2.domain([0, d3.max(g.links, function (g) {
    return g.value;
  }) + 200]);

  slider.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + height2 + ")")
    .call(xAxis2);

  slider.append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, xScale2.range());

  // append scatter plot to brush chart area
  let sliderdots = slider.append("g");
  sliderdots.selectAll("dot")
    .data(g.links)
    .enter().append("circle")
    .attr('class', 'dotslider')
    .attr("r", 3)
    .style("opacity", .5)
    .attr("cx", function (data) {
      return xScale2(data.date);
    })
    .attr("cy", function (data) {
      return yScale2(data.value);
    });

  /////////////////////////////////////////////////////////
  // create brush function redraw scatterplot with selection
  /////////////////////////////////////////////////////////

  function brushed() {
    let selection = d3.event.selection;
    // console.log("selection", selection);

    if (selection !== null) {
      let e = d3.event.selection.map(xScale2.invert, xScale2);

      let slider_selection = slider.selectAll(".dotslider");
      slider_selection.classed("selected", function (d) {
        return e[0] <= d.date && d.date <= e[1];
      })

      let force_selection = SVG_FORCE.selectAll(".link");
      force_selection.classed("selected", function (d) {
        return e[0] <= d.date && d.date <= e[1];
      })


    }

    //	add and remove nodes from data based on type filters
    store.nodes.forEach(function(n, i) {
      console.log('n:', n);
      console.log('i:', i);

      let e = d3.event.selection.map(xScale2.invert, xScale2);
      // console.log('e:', e);

      if (n.first_date > e[1]) {
        console.log("hide it!");
        filtered.push(n);
        console.log("filtered", filtered);

        graph.nodes.splice(i, 1);

        // graph.nodes.forEach(function(d, i) {
        //   if(n.id === d.id) {
        //     graph.nodes.splice(i, 1);
        //   }
        //   console.log("d", d);
        //   console.log("i", i);
        // });
      }
      update();
    });

    //	add and remove links from data based on availability of nodes
    // store.links.forEach(function(l) {
    //   if (!(typeFilterList.includes(l.sourceGroup) || typeFilterList.includes(l.targetGroup)) && l.filtered) {
    //     l.filtered = false;
    //     graph.links.push($.extend(true, {}, l));
    //   } else if ((typeFilterList.includes(l.sourceGroup) || typeFilterList.includes(l.targetGroup)) && !l.filtered) {
    //     l.filtered = true;
    //     graph.links.forEach(function(d, i) {
    //       if (l.id === d.id) {
    //         graph.links.splice(i, 1);
    //       }
    //     });
    //   }
    // });

    // update();
  }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Methods
///////////////////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////
// General update pattern for updating the graph
/////////////////////////////////////////////////////////

function update() {


  /////////////////////////////////////////////////////////
  // Update Nodes
  /////////////////////////////////////////////////////////

	//	UPDATE
	node = node.data(graph.nodes, function(d) { return d.id;});

	//	EXIT
	node.exit().remove();

	//	ENTER
  let newNode = node.enter().append("g")
		.attr("class", "node")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended)
    );

  newNode.append("circle")
      .attr("r", radius)
      .attr("fill", function(d) {return color(d.group);})
      .attr('x', 6)
      .attr('y', 3);

    newNode.append("text")
      .text(function(d) {
        if (d.label !== "EOA") {
          return d.label;
        }
      })
      .attr('x', 12)
      .attr('y', 6);

    newNode.append("title")
      .text(function(d) { return "group: " + d.group + "\n" + "id: " + d.id; });

	//	ENTER + UPDATE
	node = node.merge(newNode);


  /////////////////////////////////////////////////////////
  // Update Links
  /////////////////////////////////////////////////////////

	//	UPDATE
	link = link.data(graph.links, function(d) { return d.id;});
	//	EXIT
	link.exit().remove();
	//	ENTER
	newLink = link.enter().append("line")
		.attr("class", "link")
    .style("marker-end",  "url(#suit)");

	newLink.append("title")
      .text(function(d) { return "source: " + d.source + "\n" + "target: " + d.target; });
	//	ENTER + UPDATE
	link = link.merge(newLink);

  let force_selection = SVG_FORCE.selectAll(".link");

  /////////////////////////////////////////////////////////
  // update simulation nodes, links, and alpha
  /////////////////////////////////////////////////////////
	simulation
		.nodes(graph.nodes)
		.on("tick", ticked);

  	simulation.force("link")
  		.links(graph.links);

  	simulation.alpha(1).alphaTarget(0).restart();
}

/////////////////////////////////////////////////////////
// Force Filter
/////////////////////////////////////////////////////////

function filter() {

  //	add and remove nodes from data based on type filters
  store.nodes.forEach(function(n) {
    if (!typeFilterList.includes(n.group) && n.filtered) {
      n.filtered = false;
      graph.nodes.push($.extend(true, {}, n));
    } else if (typeFilterList.includes(n.group) && !n.filtered) {
      n.filtered = true;
      graph.nodes.forEach(function(d, i) {
        if (n.id === d.id) {
          graph.nodes.splice(i, 1);
        }
      });
    }
  });

  //	add and remove links from data based on availability of nodes
  store.links.forEach(function(l) {
    if (!(typeFilterList.includes(l.sourceGroup) || typeFilterList.includes(l.targetGroup)) && l.filtered) {
      l.filtered = false;
      graph.links.push($.extend(true, {}, l));
    } else if ((typeFilterList.includes(l.sourceGroup) || typeFilterList.includes(l.targetGroup)) && !l.filtered) {
      l.filtered = true;
      graph.links.forEach(function(d, i) {
        if (l.id === d.id) {
          graph.links.splice(i, 1);
        }
      });
    }
  });
}

/////////////////////////////////////////////////////////
// Drag UI
/////////////////////////////////////////////////////////

//	drag event handlers
function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
}

function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
}

//	tick event handler with bounded box
function ticked() {
  node
    .attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });

	// node
	// 	.attr("cx", function(d) { return d.x = Math.max(radius, Math.min(width - radius, d.x)); })
	// 	.attr("cy", function(d) { return d.y = Math.max(radius, Math.min(height - radius, d.y)); });

	link
		.attr("x1", function(d) { return d.source.x; })
		.attr("y1", function(d) { return d.source.y; })
		.attr("x2", function(d) { return d.target.x; })
		.attr("y2", function(d) { return d.target.y; });
}
