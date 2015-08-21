var MY_TYPE = "A";
var IP_GROUP = 1;
var URL_GROUP = 2;

//var width = 960,
//    height = 500;

var width = $(window).width();
    height = $(window).height();

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var dnsNodes,
    ipNodes,
    urlNodes,
    dnsLinks;

var parsedData = {"nodes":[],"links":[]};




//create nodes and links:
//From...

// {
//     "name": "verizonwireless.com.",
//     "value": "137.188.80.90",
//     "TTL": "300",
//     "type": "A"
//   },

//To...

//{"nodes":[{"name":"128.12312.12.31.23","group":IP_GROUP},
//          {"name":"somewebsite.verizonwireless.com.","group":URL_GROUP}]
//"links":[{"source":1,"target":0,"value":1},...]}

$.each(dns_records, function( index, dnsEntry ) {
  if(dnsEntry.type==MY_TYPE) {
    //create a new ipNode
    // dnsEntry.
  }
});


 
graph = mis; //loaded js with script tag in index.html

//d3 stuffs
force
    .nodes(graph.nodes)
    .links(graph.links)
    .start();

var link = svg.selectAll(".link")
    .data(graph.links)
  .enter().append("line")
    .attr("class", "link")
    .style("stroke-width", function(d) { return Math.sqrt(d.value); });

var node = svg.selectAll(".node")
    .data(graph.nodes)
  .enter().append("circle")
    .attr("class", "node")
    .attr("r", 5)
    .style("fill", function(d) { return color(d.group); })
    .call(force.drag);

node.append("title")
    .text(function(d) { return d.name; });

force.on("tick", function() {
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
});


// d3.json("miserables.json", function(error, graph) {
//   if (error) throw error;

//   force
//       .nodes(graph.nodes)
//       .links(graph.links)
//       .start();

//   var link = svg.selectAll(".link")
//       .data(graph.links)
//     .enter().append("line")
//       .attr("class", "link")
//       .style("stroke-width", function(d) { return Math.sqrt(d.value); });

//   var node = svg.selectAll(".node")
//       .data(graph.nodes)
//     .enter().append("circle")
//       .attr("class", "node")
//       .attr("r", 5)
//       .style("fill", function(d) { return color(d.group); })
//       .call(force.drag);

//   node.append("title")
//       .text(function(d) { return d.name; });

//   force.on("tick", function() {
//     link.attr("x1", function(d) { return d.source.x; })
//         .attr("y1", function(d) { return d.source.y; })
//         .attr("x2", function(d) { return d.target.x; })
//         .attr("y2", function(d) { return d.target.y; });

//     node.attr("cx", function(d) { return d.x; })
//         .attr("cy", function(d) { return d.y; });
//   });
// });