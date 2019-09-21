import React from 'react';
import * as d3 from "d3";
import Icon from '@material-ui/core/Icon';
import Button from '@material-ui/core/Button';
import Fab from '@material-ui/core/Fab';
import Tooltip from 'tooltip.js';
export default class DbViz extends React.Component{

  render(){
    return(
      <div className="db_viz">
        <Nodes />
      </div>
    )
  }
}

class Nodes extends React.Component{
  state = {
    loading: false,
    isPerfectZoom: true
  }
  componentDidMount(){
    var self = this;
    self.set();
    window.addEventListener('sinapsisModified', function(){
      if(!self.state.loading){
        d3.selectAll('#db_viz_nodes_canvas *').remove();
        self.set();
      }
    })
    window.addEventListener('sinapsisDrawerToggle', function(){
      setTimeout(function(){
        self.resize();
      }, 300);
    })
  }

  resize(){
    var container = this.container;
    const width = container.offsetWidth,
          height = container.offsetHeight;
    this.canvas.attr('width', width)
               .attr('height', height);
    this.setInitialZoom();
  }


  set(){
    d3.selectAll('#db_viz_nodes_canvas *').remove();
    this.setState({
      loading: true
    })
    var self = this;
    var container = this.container;
    var nodesData = window.dbf.getMatches();
    this.nodesData = nodesData;
    const width = container.offsetWidth,
          height = container.offsetHeight;
    var canvas = d3.select("#db_viz_nodes_canvas")
                   .attr('width', width)
                   .attr('height', height);
    this.canvas = canvas;


    var simulation = d3.forceSimulation()
                       .force("charge", d3.forceManyBody(10))
                       .force("link",
                          d3.forceLink()
                            .id(function(d){
                              return d.id;
                            })
                        )
                       .force('collide', d3.forceCollide(700).strength(0.6).iterations(2))
                       .force('center', d3.forceCenter(width / 2, height / 2))
                       .force("y", d3.forceY(0.01))
                       .force("x", d3.forceX(0.01).x(1.1));

   this.simulation = simulation;
   this.nodesContainer = canvas.append('g').attr('class', 'nodes_container');

   var zoom = d3.zoom()
                .extent([[0, 0], [width, height]])
                .scaleExtent([-3, 8])
                .on("zoom", function(z){
                   var d = d3.event.transform;
                   self.setState({
                     isPerfectZoom: false
                   })
                   canvas.select('.nodes_container').attr('transform', d);
                 });
   this.zoom = zoom;
   canvas.call(zoom)

   simulation.nodes(nodesData.nodes)
             .on('tick', this.drawNodes)


   simulation.force('link')
             .links(nodesData.links);


    var data = this.nodesData;
    var empresaMinMax = this.getEmpresaMinMax();
    var circlesData = [];
    var labelsData = [];

    data.nodes.map(function(d){
      var t = d.type;
      var labelTypes = ['dependencia', 'instancia', 'titular'];
      if(labelTypes.indexOf(t) > -1){
        labelsData.push(d);
      }else{
        circlesData.push(d);
      }
    })

    var links = self.nodesContainer
                   .selectAll('line')
                   .data(data.links)
                   .enter()
                   .append('line')
                   .attr('stroke-width', 8)
                   .attr('class', 'nodes_link')
                   .attr('data-from', l => l.source.id)
                   .attr('data-to', l => l.target.id)
                   .attr('stroke', 'rgba(90, 67, 231, 0.79)');
    this.links = links;


    var nodesLabels = self.nodesContainer
                          .selectAll('.nodes_label')
                          .data(labelsData)
                          .enter(labelsData)
                          .append('g')
                          .attr('class', 'nodes_label node')
                          .attr('data-id', d => d.id)
                          .call(this.drag())
                          .on('mouseenter', function(d){
                            self.isolateNode(d.id);
                          })
                          .on('click', function(d){
                            d.isclicked = true;
                            self.isolateNode(d.id)
                          })
                          .on('mouseleave', function(d){
                            self.nodesContainer.selectAll('.viz_tooltip').remove();
                            self.nodesContainer.selectAll('.nodes_link').attr('stroke', 'rgba(90, 67, 231, 0.79)');
                            self.nodesContainer.selectAll('.node').attr('opacity', 1)
                          })

    nodesLabels.append('rect')
               .attr('fill', '#222')
               .attr('width', 2000)
               .attr('height', 260)
               .attr('x', -1000)
               .attr('y', -210)

    nodesLabels.append('text')
               .text((d) => d.name.toUpperCase())
               .attr('fill', 'white')
               .attr('font-size', 240)
               .attr('text-anchor', 'middle')

    var nodesCircles = self.nodesContainer
                      .selectAll('circle')
                      .data(circlesData)
                      .enter()
                      .append('circle')
                      .attr('class', 'node')
                      .attr('data-name', (d) => d.name)
                      .attr('data-id', d => d.id)
                      .attr('id', (d, i) => 'node_'+i)
                      .attr('r', function(d){
                        var t = d.type;
                        if(t == "empresa"){
                          var s = d.sum ? d.sum : 0;
                          var r = s / empresaMinMax.max;
                          var n = (400 * r) + 55;
                          if(isNaN(n)){
                            n = 55;
                          }
                          return n;
                        }
                        return 50;
                      })
                      .attr('data-type', (d) => d.type)
                      .attr('fill', function(d){
                        var t = d.type;
                        switch(t){
                          case "empresa":
                            return "white";
                          break;
                          case "rfc":
                            return "blue";
                          break;
                          case "website":
                            return "orange";
                          break;
                          case "person":
                            return "rgb(254, 18, 53)";
                          break;
                          case "email":
                            return "yellow";
                          break;
                          case "convenio":
                            return "green";
                          break;
                          case "instancia":
                            return "rgb(20, 151, 215)";
                          break;
                          default:
                            return "#888888";
                          break;
                        }
                      })
                      .call(this.drag())
                      .on('mouseover', function(d){
                        self.nodesContainer.selectAll('.viz_tooltip').remove();
                        var g = self.nodesContainer
                                .append('g')
                                .attr('class', 'viz_tooltip')
                                .attr("transform", "translate(" + d.x + "," + (d.y - 150) + ")");
                        g.append('rect')
                         .attr('width', 3500)
                         .attr('height', 180)
                         .attr('x', -1750)
                         .attr('y', -150)
                         .attr('fill', "white")
                         .style('pointer-events', 'none')

                        g.append('text')
                         .text(d.name)
                         .attr('text-anchor', 'middle')
                         .style('font-size', 120)

                        self.isolateNode(d.id);
                      })
                      .on('click', function(d){
                        d.isclicked = true;
                        self.isolateNode(d.id)
                      })
                      .on('mouseleave', function(d){
                        self.nodesContainer.selectAll('.viz_tooltip').remove();
                        self.nodesContainer.selectAll('.nodes_link').attr('stroke', 'rgba(90, 67, 231, 0.79)');
                        self.nodesContainer.selectAll('.node').attr('opacity', 1)
                      })

    this.nodesLabels = nodesLabels;
    this.nodesCircles = nodesCircles;


    this.setInitialZoom();

    setTimeout(function(){
      self.setState({
        loading: false
      })
    }, 5000);
  }

  isolateNode(id){
    var self = this;

    this.nodesContainer
       .selectAll('.nodes_link:not([data-from="'+id+'"]):not([data-to="'+id+'"])')
       .attr('stroke', 'rgba(90, 67, 231, 0.1)');

    var ls = this.nodesData.links.filter(function(l){
      return l.target.id == id || l.source.id == id;
    });

    var nds_ids = [];

    ls.map(function(ld){
      nds_ids.push(ld.source.id)
      nds_ids.push(ld.target.id)
    });

    nds_ids.push(id);


    this.nodesContainer
        .selectAll('.node')
        .attr('opacity', 0.05)
        // .style('pointer-events', 'none')

    nds_ids.map(function(id){
      self.nodesContainer
          .selectAll('.node[data-id="'+id+'"]')
          .style('pointer-events', 'all')
          .attr('opacity', 1)
    })

  }

  getEmpresaMinMax(){
    var d = this.nodesData;
    var min = 0;
    var max = 0;
    var n = d.nodes;
        n = Object.values(n);

    n.map(function(e){
      if(e.sum && e.type == 'empresa'){
        min = Math.min(e.sum, min);
        max = Math.max(e.sum, max);
      }
    })
    return {
      min: min,
      max: max
    }
  }

  drawNodes = e => {
    var self = this;
    var data = this.nodesData;
    /* Nodos */

    this.links
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

    this.nodesCircles
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)

    this.nodesLabels.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
          });


  }

  setInitialZoom(){
    var self = this;
    var container = this.container;
    const width = container.offsetWidth,
          height = container.offsetHeight;

    var box = this.nodesContainer.node().getBBox();

    var zoomIdentity = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.02)
    this.nodesContainer.attr('transform', zoomIdentity);
    this.canvas.call(this.zoom.transform, zoomIdentity);

    this.setState({
      isPerfectZoom: true
    })

  }

  drag(){
    var simulation = this.simulation;
    var self = this;
    function dragstarted(d) {
       if (!d3.event.active) simulation.alphaTarget(0.1).restart();
       d.fx = d.x;
       d.fy = d.y;
     }

     function dragged(d) {
       d.fx = d3.event.x;
       d.fy = d3.event.y;
     }

     function dragended(d) {
       if (!d3.event.active) simulation.alphaTarget(0.1).restart();
       d.fixed = true;
       simulation.stop();
     }

   return d3.drag()
             .on("start", dragstarted)
             .on("drag", dragged)
             .on("end", dragended);
  }

  render(){
    return(
      <div className="db_viz_nodes" ref={(ref) => this.container = ref}>
        <div id="db_viz_nodes_controls">
          <Fab size="small" color="primary" onClick={() => this.set()}>
            <Icon>autorenew</Icon>
          </Fab>
          <Fab size="small" color="primary" disabled={this.state.isPerfectZoom} onClick={() => this.setInitialZoom()}>
            <Icon>center_focus_strong</Icon>
          </Fab>
        </div>
        <svg id="db_viz_nodes_canvas"></svg>
      </div>
    )
  }
}
