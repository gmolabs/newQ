var MY_TYPE = "A";
var IP_GROUP = 1;
var URL_GROUP = 5;
var LINK_VALUE = 10;
var PREV_LINK_VALUE = 3;
var N_LEV = 2;
var LEV_STRENGTH_FACTOR = 5;
var MIN_LEV = 5;
var N_ENTRIES = 50;
var LEV_LINK_SIZE = 1;
var NODE_SIZE = 5;
var RANGE_START = 0;

//filter data down to type "A"
dns_records = dns_records.filter(typeA);
nData = dns_records.length;

//dat.GUI tho
var gui = new dat.GUI();
var config = {
  "# of IPs" : N_ENTRIES,
  "start at" : RANGE_START,
  "range" : N_ENTRIES,
  "clusteryness" : MIN_LEV,
  "show similarity links" : false
}

var levController = gui.add(config, "show similarity links");

levController.onFinishChange(function(value) {
  if(value) {
    d3.selectAll(".lev")
    .classed("hidden", false);
  } else {
    d3.selectAll(".lev")
    .classed("hidden", true);
  } 
});

//Controls for variable node display...disabled until dynamic nodes fixed
//var nRecsController = gui.add(config, "# of IPs").min(1).max(50).step(1);
//var startAtController = gui.add(config, "start at").min(0).max(nData-50).step(1);
//var clusterynessController = gui.add(config, "clusteryness").min(0).max(30).step(1);

// nRecsController.onFinishChange(function(value) {
//   N_ENTRIES = value;
//   parse();
// });

// startAtController.onFinishChange(function(value) {
//   RANGE_START = value;
//   parse();
// });


// clusterynessController.onFinishChange(function(value) {
//   MIN_LEV = value;
//   parse();
// });





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

//use d3 tooltips
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return d.name;
  });

//instantiate d3 svg
var svg = d3.select("#force-container").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(tip);



//bifurcate into link and node layer
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


//some utils
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

var findNodeNameByID = function(searchID) {
  // console.log("found node named: "+parsedData.nodes[findNodeIndexByID(searchID)].name);
  return parsedData.nodes[findNodeIndexByID(searchID)].name;
}

//filter to "A" type
function typeA(value) {
  return value.type == "A";
}

function directLinks(value) {
  return value.type == "direct"
}

function ipsOnly(value) {
  return value.group==IP_GROUP;
}

function urlsOnly(value) {
  return value.group==URL_GROUP;
}

//parse json, pushing edges, ip. and url nodes into the d3 format

function parse() {
  //empty out the old data if it exists
  existingURLID = null;
  existingIPID = null;
  nEntries = 0;
  var urlNodeIndex = null;
  var ipNodeIndex = null;
  parsedData.nodes.length=0;
  parsedData.links.length=0;
 
  //go through the entries, up to the desired limit.  
  //we already filtered the dns_records down to "A" type
  for (var index=RANGE_START;index<RANGE_START+N_ENTRIES; index++) {
    dnsEntry = dns_records[index];
    if(dnsEntry.type==MY_TYPE&&nEntries<N_ENTRIES) {
      var existingURLID = findIPID(dnsEntry.name);
      if(existingURLID===null) {
        //push a new node
        var urlNodeIndex = parsedData.nodes.push({"name":dnsEntry.name
                                                  ,"group":URL_GROUP
                                                  ,"id":"url"+index
                                                  ,"mySize":NODE_SIZE});
        existingURLID="url"+index;

      } else {
        //make the existing node phatter
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
        //console.log("duplicate ip");
        var oldsize = parsedData.nodes[findNodeIndexByID(existingIPID)].mySize;
        parsedData.nodes[findNodeIndexByID(existingIPID)].mySize = oldsize + NODE_SIZE/2;
      }

      //create a link from the url node to its ip node
      parsedData.links.push({"source":findNodeIndexByID(existingURLID)
                            ,"target":findNodeIndexByID(existingIPID)
                            ,"value":LINK_VALUE
                            ,"linkLength":3
                            ,"type":"direct"});

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

  //start initiates the force layout with this fantastic data
  start();

}

function compareByName(a, b) {
  if ( a.name < b.name )
    return -1;
  if ( a.name > b.name )
    return 1;
  return 0;
}

function compareBySource(a, b) {
  if (a.source < b.source)
    return -1;
  if (a.name > b.name)
    return 1;
  return 0;
}
function compareByTarget(a, b) {
  if (a.target > b.target)
    return -1;
  if (a.target < b.target)
    return 1;
  return 0;
}


function start() {
  //create links in the svg, bind to data
  var link = svg.select(".links").selectAll(".link")
    .data(parsedData.links);

    //init link svg
    link.enter().insert("line", "g.node")
      .attr("class", function(d) {
        //if a relatedness link, add hidden class
        if(d.type=="lev") {
          return "link lev hidden";
        } else {
          return "link";
        }
      })
      .attr("linkLength", function(d) { return d.linkLength; })
      .attr("type", function(d) { return d.type; })
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });
    link.exit().remove();

  //create nodes in svg, bind to data
  var node = svg.select(".nodes").selectAll("circle.node")
    .data(parsedData.nodes);

    //init node svg
    node.enter().append("circle")
    .attr("class", "node")
    .attr("r", function(d) {return d.mySize;})
    .attr("x", 0)
    .attr("y", 0)
    .attr("name", function(d) {return d.name;})
    .style("fill", function(d) { return color(d.group); });

    //remove svg when the data is removed
    node.exit().remove();

    //use the force
    node.call(force.drag);

    //mouse interaction
    node.on('mouseout', tip.hide);
    node.on('mousedown', tip.hide);
    node.on('mouseup', tip.hide);
    node.on('mouseover', function(d) {
      //add tooltip and create text view of the selected node, its direct link, 
      //its nearest neighbors, and thier direct links.
      if(!down) {
        var context = this;
        var args = [].slice.call(arguments);
        args.push(this);
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          tip.show.apply(context, args);
        }, 150);
        //console.log(d.id);
        $("#selectedName").text(d.name);
        var linkedNodeNames = [];
        for(var i=0; i<parsedData.links.length; i++) {
          if(parsedData.links[i].type=="direct") {
            if(parsedData.links[i].source.id==d.id) {
              linkedNodeNames.push(findNodeNameByID(parsedData.links[i].target.id));
            } else if (parsedData.links[i].target.id==d.id) {
              linkedNodeNames.push(findNodeNameByID(parsedData.links[i].source.id));
            }
          }
        }

        $("#friendName").html(linkedNodeNames.toString().split(",").join("<br>"));
        var neighborPairs = [];
        //clear out old data
        $("#selectedNeighborNames").text("");
        $("#neighborFriendNames").text("");
        for(var i=0; i<parsedData.links.length; i++) {
          if(parsedData.links[i].type=="lev") {
            if(parsedData.links[i].target.id==d.id) {
              //neighbor pair part 1
              var myId = parsedData.links[i].source.id;
              //find that node's direct link
              for(var j=0; j<parsedData.links.length; j++) {
                if(parsedData.links[j].type=="direct") {
                  if(parsedData.links[j].source.id==myId) {
                    var targetId = parsedData.links[j].target.id;
                    //$("#neighborFriendNames").append(findNodeNameByID(targetId)+"<br>");
                    neighborPairs.push({"source":findNodeNameByID(myId), "target":findNodeNameByID(targetId)})
                  } else if(parsedData.links[j].target.id==myId) {
                    var sourceId = parsedData.links[j].source.id;
                    // $("#neighborFriendNames").append(findNodeNameByID(parsedData.links[j].source.id)+"<br>");
                    neighborPairs.push({"source":findNodeNameByID(myId), "target":findNodeNameByID(sourceId)})
                  }
                }
              }
            }
          }
        }
        //sort alphabetically by left hand side
        neighborPairs.sort(compareByTarget);
        for(var i=0;i<neighborPairs.length;i++) {
          myPair = neighborPairs[i];
          //add to dom
          $("#selectedNeighborNames").append(myPair.source+"<br>");
          $("#neighborFriendNames").append(myPair.target+"<br>");
        }

      }
    });

  //init force
  force
      .nodes(parsedData.nodes)
      .links(parsedData.links)
      .start();

  //animation
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