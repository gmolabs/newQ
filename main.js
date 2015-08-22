var MY_TYPE = "A";
var IP_GROUP = 1;
var URL_GROUP = 5;
var LINK_VALUE = 1;
var PREV_LINK_VALUE = 3;
var N_LEV = 2;
var LEV_STRENGTH_FACTOR = 2;
var MIN_LEV = 30;
var N_ENTRIES = 50;
// var width = 960,
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

var nEntries = 0;





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

//util
// var isNewIP = function(ip) {
//     for (var i = 0, len = parsedData.nodes.length; i < len; i++) {
//         if (parsedData.nodes[i].value === ip) {
//           console.log("duplicate ip: "+ip);
//           return false;
//         }
//     }
//     return true; // The object was not found
// }


var findIPID = function(ip) {
    for (var i = 0, len = parsedData.nodes.length; i < len; i++) {
        if (parsedData.nodes[i].name === ip) {
            return parsedData.nodes[i].id; // Return id as soon as the object is found
        }
    }
    return null; // The object was not found
}

var findNodeIndexByID = function(searchID) {
    for (var i = 0, len = parsedData.nodes.length; i < len; i++) {
        if (parsedData.nodes[i].id === searchID) {
            return i; // Return i as soon as the object is found
        }
    }
    return null; // The object was not found
}


$.each(dns_records, function( index, dnsEntry ) {
  if(dnsEntry.type==MY_TYPE&&nEntries<N_ENTRIES) {
    var isNewIPNode = false;
    
    //URLs are unique. Make a node for each entry
    var urlNodeIndex = parsedData.nodes.push({"name":dnsEntry.name
                                              ,"group":URL_GROUP
                                              ,"id":"url"+index});
    
    //IPs may be duplicates. Check against existing nodes
    var existingIPID = findIPID(dnsEntry.value);
    if(existingIPID===null) {
      ipNodeIndex = parsedData.nodes.push({"name":dnsEntry.value
                                          ,"group":IP_GROUP
                                          ,"id":"ip"+index});
      existingIPID="ip"+index;
    }

    //create a link from the url node to its ip node
    parsedData.links.push({"source":findNodeIndexByID("url"+index)
                          ,"target":findNodeIndexByID(existingIPID)
                          ,"value":LINK_VALUE});

    nEntries++;
  }
});

//now go through nodes, adding edges with values based on levenshtein difference
//create edges for the N_LEV nearest nodes of its kind.

$.each(parsedData.nodes, function( index, node ) {
  var lowScore = 100000;
  var nextNode = null;
  for (var i = 0, len = parsedData.nodes.length; i < len; i++) {
      score = levenshtein(node.name, parsedData.nodes[i].name);
      if(score<lowScore&&score>0&&score<MIN_LEV) {
        lowScore = score;
        nextNode = parsedData.nodes[i];
        parsedData.links.push({"source":findNodeIndexByID(node.id)
                          ,"target":findNodeIndexByID(nextNode.id)
                          ,"value":0});
      }
    }
    //create a link from the  node to its nearest neighbor
    
    
  //add a link for the smallest two non-zero scores.

});

console.log(parsedData);


 
graph = parsedData; //loaded js with script tag in index.html

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

//external json loading...
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