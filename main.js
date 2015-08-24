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
var RANGE_START = 0;
// var width = 960,
//    height = 500;


//dat.GUI tho
var gui = new dat.GUI();
var config = {
  "nRecs" : N_ENTRIES,
  "showLev" : false
}
// gui.add(gui, "showLev");
var nRecsController = gui.add(config, "nRecs").min(1).max(50).step(1);
var levController = gui.add(config, "showLev");

nRecsController.onFinishChange(function(value) {
  N_ENTRIES = value;
  parse(dns_records);
});

levController.onFinishChange(function(value) {
  if(value) {
    d3.selectAll(".lev")
    .classed("hidden", false);
  } else {
    d3.selectAll(".lev")
    .classed("hidden", true);
  } 
});



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

svg.append("g").attr("class", "links");
svg.append("g").attr("class", "nodes");

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

//console.log(dns_records);



function parse() {
  var oldData = parsedData;
  dns_records = dns_records.filter(typeA);
  existingURLID = null;
  existingIPID = null;
  nEntries = 0;
  var urlNodeIndex = null;
  var ipNodeIndex = null;
  //empty out the old data //?
  parsedData.nodes.splice(0, parsedData.nodes.length);
  parsedData.links.splice(0, parsedData.links.length);
  // parsedData.links.length=0;
  //console.log("parsing: "+myRecs);
  //console.log("parsing nEntries: "+N_ENTRIES);
  //$.each(dns_records, function( index, dnsEntry ) {
  for (var index=RANGE_START;index<RANGE_START+N_ENTRIES; index++) {
    dnsEntry = dns_records[index];
    if(dnsEntry.type==MY_TYPE&&nEntries<N_ENTRIES) {
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
        console.log(parsedData.nodes[findNodeIndexByID(existingURLID)].mySize = newsize = oldsize + NODE_SIZE/2);
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
        var oldsize = parsedData.nodes[findNodeIndexByID(existingIPID)].mySize;
        parsedData.nodes[findNodeIndexByID(existingIPID)].mySize = oldsize + NODE_SIZE/2;
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
  });

  start();

}


function start() {
  //graph = parsedData; //loaded js with script tag in index.html
  // console.log(graph);
  
  var link = svg.select(".links").selectAll("line.link")
    .data(parsedData.links);

    link.enter().insert("svg:line", "g.node")
      .attr("class", function(d) {
        if(d.type=="lev") {
          //console.log("lev link hidden");
          return "link lev hidden";
        } else {
          return "link";
        }
      })
      .attr("linkLength", function(d) { return d.linkLength; })
      .attr("type", function(d) { return d.type; })
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });
    link.exit().remove();

  console.log(link);

  var node = svg.select(".nodes").selectAll("circle.node")
    .data(parsedData.nodes);

    node.enter().append("circle")
    .attr("class", "node")
    .attr("r", function(d) {return d.mySize;})
    .attr("x", 0)
    .attr("y", 0)
    .attr("name", function(d) {return d.name;})
    .style("fill", function(d) { return color(d.group); });

    node.call(force.drag);
    
    node.on('mouseout', tip.hide);
    node.on('mousedown', tip.hide);
    node.on('mouseup', tip.hide);
    node.on('mouseover', function(d) {
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

    node.exit().remove();

    console.log(node);

  //init force

  force
      .nodes(parsedData.nodes)
      .links(parsedData.links)
      // .resume()
      .start();

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  });

  force.start();
}

parse();
