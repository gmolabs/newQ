var MY_TYPE = "A";
var IP_GROUP = 1;
var URL_GROUP = 5;
var LINK_VALUE = 10;
var PREV_LINK_VALUE = 3;
var N_LEV = 2;
var LEV_STRENGTH_FACTOR = 2;
var MIN_LEV = 5;
var N_ENTRIES = 50;
var LEV_LINK_SIZE = 1;
var NODE_SIZE = 5;
var RANGE_START = 3000;
// var width = 960,
//    height = 500;




var timeout;


var width = $(window).width();
    height = $(window).height();

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(function(d) { 
        return d.linkLength;
     })
    .size([width, height]);

//use d3 titles
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return d.name;
  });


var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(tip);

var dnsNodes,
    ipNodes,
    urlNodes,
    dnsLinks;

var parsedData = {"nodes":[],"links":[]};

var nEntries = 0;

//mouse tracking util
var down = false;
$(document).mousedown(function() {
    down = true;
}).mouseup(function() {
    down = false;  
});





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
        if (parsedData.nodes[i].name == ip) {
            return parsedData.nodes[i].id; // Return id as soon as the object is found
        }
    }
    return null; // The object was not found
}

var findNodeIndexByID = function(searchID) {
    for (var i = 0, len = parsedData.nodes.length; i < len; i++) {
        if (parsedData.nodes[i].id == searchID) {
            return i; // Return i as soon as the object is found
        }
    }
    return null; // The object was not found
}

//filter to "A" type
function typeA(value) {
  return value.type == "A";
}

dns_records = dns_records.filter(typeA);
console.log(dns_records);

//$.each(dns_records, function( index, dnsEntry ) {
for (var index=RANGE_START;index<RANGE_START+N_ENTRIES; index++) {
  dnsEntry = dns_records[index];
  if(dnsEntry.type==MY_TYPE&&nEntries<N_ENTRIES) {
    // var isNewIPNode = false;
    var existingURLID = findIPID(dnsEntry.name);
    if(existingURLID===null) {
      var urlNodeIndex = parsedData.nodes.push({"name":dnsEntry.name
                                                ,"group":URL_GROUP
                                                ,"id":"url"+index
                                                ,"mySize":NODE_SIZE});
      existingURLID="url"+index;

    } else {
      console.log("duplicate url;");
      var oldsize = parsedData.nodes[findNodeIndexByID(existingURLID)].mySize;
      parsedData.nodes[findNodeIndexByID(existingURLID)].mySize = newsize = oldsize + NODE_SIZE/2;
    }
    
    var existingIPID = findIPID(dnsEntry.value);
    if(existingIPID===null) {
      ipNodeIndex = parsedData.nodes.push({"name":dnsEntry.value
                                          ,"group":IP_GROUP
                                          ,"id":"ip"+index
                                          ,"mySize": NODE_SIZE});
      existingIPID="ip"+index;
    } else {
      console.log("duplicate ip");
      var oldsize = parsedData.nodes[findNodeIndexById(existingIPID)].mySize;
      parsedData.nodes[findNodeIndexById(existingIPID)].mySize = oldsize + NODE_SIZE/2;
    }

    //create a link from the url node to its ip node
    parsedData.links.push({"source":findNodeIndexByID(existingURLID)
                          ,"target":findNodeIndexByID(existingIPID)
                          ,"value":LINK_VALUE
                          ,"linkLength":3});

    nEntries++;
  }
};

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
                          ,"value":5/score
                          ,"linkLength":score*5
                          ,"type":"lev"});
      }
    }
    //create a link from the  node to its nearest neighbor
    
    
  //add a link for the smallest two non-zero scores.

});

//console.log(parsedData);


 
graph = parsedData; //loaded js with script tag in index.html

//d3 stuffs
force
    .nodes(graph.nodes)
    .links(graph.links)
    .start();

var link = svg.selectAll(".link")
    .data(graph.links)
  .enter().append("line")
    .attr("class", function(d) {
      if(d.type=="lev") {
        //console.log("lev link hidden");
        return "lev link hidden";
      } else {
        return "link";
      }
    })
    .attr("linkLength", function(d) { return d.linkLength; })
    .attr("type", function(d) { return d.type; })
    .style("stroke-width", function(d) { return Math.sqrt(d.value); });


var node = svg.selectAll(".node")
    .data(graph.nodes)
  .enter().append("circle")
    .attr("class", "node")
    .attr("r", function(d) {return d.mySize;})
    .attr("x", 0)
    .attr("y", 0)
    .attr("name", function(d) {return d.name;})
    .style("fill", function(d) { return color(d.group); })
    .call(force.drag)
    .on('mouseout', tip.hide)
    .on('mousedown', tip.hide)
    .on('mouseup', tip.hide)
    .on('mouseover', function(d) {
      if(!down) {
        var context = this;
        var args = [].slice.call(arguments);
        args.push(this);
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          tip.show.apply(context, args);
        }, 150);
      }
    });

//append name as title
// node.append("title")
//     .text(function(d) { return d.name; });



//init force

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

//fisheye

// var fisheye = d3.fisheye.circular()
//     .radius(200)
//     .distortion(2);

// svg.on("mousemove", function() {
//   fisheye.focus(d3.mouse(this));

//   node.each(function(d) { d.fisheye = fisheye(d); })
//       .attr("cx", function(d) { return d.fisheye.x; })
//       .attr("cy", function(d) { return d.fisheye.y; })
//       .attr("r", function(d) { return d.fisheye.z * 4.5; });

//   link.attr("x1", function(d) { return d.source.fisheye.x; })
//       .attr("y1", function(d) { return d.source.fisheye.y; })
//       .attr("x2", function(d) { return d.target.fisheye.x; })
//       .attr("y2", function(d) { return d.target.fisheye.y; });
// });


// // Listen to changes within the GUI
// gui.add(gui, "nRecs").onChange(function(newValue) {
//   console.log("Value changed to:  ", newValue);
// });

// // Listen to changes outside the GUI - GUI will update when changed from outside
// gui.add(gui, "nRecs").listen();


//dat.GUI tho
var gui = new dat.GUI();
var config = {
  "nRecs" : N_ENTRIES,
  "showLev" : false
}
// gui.add(gui, "showLev");
gui.add(config, "nRecs").min(1).max(50).step(1);
var levController = gui.add(config, "showLev");

levController.onChange(function(value) {
  d3.selectAll(".lev")
  .classed("hidden", function (d, i) {
    return !d3.select(this).classed("hidden");
  });
  
});