/*******************************************************
 * siren-json HTML/SPA client engine 
 * siren representor (server)
 * June 2015
 * Mike Amundsen (@mamund)
 * Soundtrack : Motown Classics Gold (2005)
 *******************************************************/

/* NOTE:  
  - has fatal dependency on: dom-help.js
  - relies on siren-sop for object metadata
  - uses no other external libs/frameworks
  
  - built/tested for chrome browser (YMMV on other browsers)
  - not production robust (missing error-handling, perf-tweaking, etc.)
  - report issues to https://github.com/lchbook/
*/

function siren() {

  var d = domHelp();  
  var g = {};
  
  g.url = '';
  g.msg = null;
  g.stype = "application/prs.siren-sop+json";
  g.ctype = "application/x-www-form-urlencoded";
  g.atype = "application/vnd.siren+json";
  g.title = "";
  g.context = "";
  g.profile = {}; // siren-sop object metadata

  // init library and start
  function init(url, title) {

    g.title = title||"Siren Client";
    
    if(!url || url==='') {
      alert('*** ERROR:\n\nMUST pass starting URL to the library');
    }
    else {
      g.url = url;
      req(g.url,"get");
    }
  }

  // primary loop
  function parseMsg() {
    var profile;
    
    sirenClear();
    title();
    dump();

    profile = getProfileLink();
    if(profile) {
      req(profile.href, "get", null, null, g.stype);
    }
    else {
      parseSiren();
    }
  }

  // finish parsing the siren response
  function parseSiren() {
    getContent();
    links();
    entities();
    properties();
    actions();
  }

  // handle title for page
  function title() {
    var elm
    
    elm = d.find("title");
    elm.innerText = g.title;
    
    elm = d.tags("title");
    elm[0].innerText = g.title;
  }
  
  // handle response dump
  // just for debugging help
  function dump() {
    var elm = d.find("dump");
    elm.innerText = JSON.stringify(g.msg, null, 2);
  }
    
  // get response content
  function getContent() {
    var elm, coll;
    
    if(g.msg.properties) {
      coll = g.msg.properties;
      for(var prop in coll) {
        if(prop==="content") {
          elm = d.find("content");
          elm.innerHTML = coll[prop];
          break;
        } 
      }
    }
  }  
  
  // links
  function links() {
    var elm, coll;
    var menu, a;
    
    elm = d.find("links");
    d.clear(elm);

    if(g.msg.links) {
      menu = d.node("div");
      menu.className = "ui blue fixed top menu";
      menu.onclick = httpGet;
      coll = g.msg.links;
      for(var link of coll) {
        // only render if NOT a "profile" link
        if(link.rel.indexOf("profile")===-1) {
          a = d.anchor({
            rel:link.rel.join(" "),
            href:link.href,
            text:link.title||link.href, 
            className:link.class.join(" ") + " item",
            type:link.type||""
          });
          d.push(a, menu);
        }
      }
      d.push(menu, elm);
    }
  }

  // entities
  function entities() {
    var elm, coll, cls, sop;
    var segment, menu, a, table, tr_data;
    
    elm = d.find("entities");
    d.clear(elm);
    
    if(g.msg.entities) {
      
      coll = g.msg.entities;
      for(var item of coll) {
        segment = d.node("div");
        segment.className = "ui segment";

        // look up profile    
        cls = item.class[0];
        if(cls) {
          sop = g.profile[cls];
        }
        
        // if we have a profile...
        if(sop) {
          menu = d.node("div");
          menu.className = "ui mini buttons";
          a = d.anchor({
            href:item.href,
            rel:item.rel.join(" "),
            className:item.class.join(" ") + " ui basic blue button",
            text:item.title||item.href});
          a.onclick = httpGet;
          d.push(a, menu);
          d.push(menu, segment);

          table = d.node("table");
          table.className = "ui table";
          for(var prop in item) {
            // only show properties from the profile
            if(sop[prop] && sop[prop].display===true) {
              tr_data = d.data_row({
                className:"item "+item.class.join(" "),
                text:sop[prop].prompt+"&nbsp;",
                value:item[prop]+"&nbsp;"
              });
              d.push(tr_data, table);
            }
          }
          d.push(table, segment);
        }
        d.push(segment, elm);
      }
    }

    if (elm.hasChildNodes()) {
      elm.style.display = "block";
    } else {
      elm.style.display = "none";
    }
  }
  
  // actions  
  function actions() {
    var elm, coll;
    var segment, frm, header, field, submit;
    
    elm = d.find("actions");
    d.clear(elm);

    if(g.msg.actions) {
      coll = g.msg.actions;

      for(var act of coll) {
        segment = d.node("div");
        segment.className = "ui green segment";
        frm = d.node("form");
        frm.className = "ui form";
        frm.id = act.name;
        frm.setAttribute("smethod",act.method);
        frm.method = act.method;
        frm.action = act.href;
        frm.onsubmit = httpForm;
        header = d.node("div");
        header.className = "ui dividing header";
        header.innerHTML = act.title;
        d.push(header, frm);
        for (var fld of act.fields) {
          field = d.node("p");
          field.className = "inline field";
          input = d.input({
            "prompt" : fld.title||fld.name,
            "name" : fld.name,
            "className" : fld.class.join(" "),
            "value" : g.msg.properties[fld.name]||fld.value,
            "type" : fld.type||"text",
            "required" : fld.required||false,
            "readOnly" : fld.readOnly||false,
            "pattern" : fld.pattern||""
          });
          d.push(input, field);
          d.push(field, frm);
        }

        submit = d.node("input");
        submit.className = "ui positive mini submit button";
        submit.type = "submit";
        d.push(submit, frm);
        d.push(frm, segment);
        d.push(segment, elm);
      }
    }
  }  
  
  // properties
  function properties() {
    var elm, coll, cls, sop;
    var table, a, tr_data;
    
    elm = d.find("properties");
    d.clear(elm);
    
    if(g.msg.class) {
      cls = g.msg.class[0];
    }
    if(cls) {
      sop = g.profile[cls]
    }
    
    if(g.msg.properties) {
      table = d.node("table");
      table.className = "ui table";
      
      if(cls==="error") {
        sop = {};
        a = d.anchor({
          href:g.url,
          rel:"error",
          className:"error",
          text:"Reload"});
          a.onclick = httpGet;
        d.push(a, elm);
      }
      
      coll = g.msg.properties;
      for(var prop in coll) { 
        // only show properties from the profile
        if(sop[prop] && sop[prop].display===true) {
          tr_data = d.data_row({
            className:"item "+g.msg.class.join(" ")||"",
            text:sop[prop].prompt+"&nbsp;",
            value:coll[prop]+"&nbsp;"
          });
          d.push(tr_data,table);
        }
        else { 
          // if we're in error mode, show them all
          if(cls==="error") {
            tr_data = d.data_row({
              className:"item "+g.msg.class.join(" ")||"",
              text:prop+"&nbsp;",
              value:coll[prop]+"&nbsp;"
            });
            d.push(tr_data,table);
          }
        }
      }
      if (table.hasChildNodes()) {
        d.push(table, elm);
      }

      if (elm.hasChildNodes()) {
        elm.style.display = "block";
      } else {
        elm.style.display = "none";
      }
    }
  }  

  // ***************************
  // siren helpers
  // ***************************

  // clear out the page
  function sirenClear() {
    var elm;

    elm = d.find("dump");
    d.clear(elm);
    elm = d.find("links");
    d.clear(elm);
    elm = d.find("actions");
    d.clear(elm);
    elm = d.find("entities");
    d.clear(elm);
    elm = d.find("properties");
    d.clear(elm);
    elm = d.find("content");
    d.clear(elm);
    elm = d.find("error");
    d.clear(elm);
  }

  // find that sop profile link!
  function getProfileLink() {
    var coll, rtn;
    
    if(g.msg.links) {
      coll = g.msg.links;
      for(var link of coll) {
        if(link.rel && link.rel.indexOf("profile")!==-1) {
          rtn = link;
          break;
        }
      }
    }
    return rtn;
  }

  // ********************************
  // ajax helpers
  // ********************************  

  // mid-level HTTP handlers
  function httpGet(e) {
    req(e.target.href, "get", null);
    return false;
  }

  function httpForm(e) {
    var form, coll, method, url, i, x, args, body;

    body = null;
    args = {};
    form = e.target;
    url = form.action; 
    method = form.getAttribute("smethod").toLowerCase();
    nodes = d.tags("input", form);
    for (i = 0, x = nodes.length; i < x; i++) {
      if (nodes[i].name && nodes[i].name !== '') {
        args[nodes[i].name] = nodes[i].value;
      }
    }
    if(method==="get") {
      i = 0;
      for(var inp in args) {
        if(i===0) {
          url +="?";
          i++;
        }
        else {
          url +="&";
        }
        url += inp + "=" + args[inp];
      }
    }
    else {
      body = "";
      for(var inp in args) {
        if(body!=="") {
          body += "&";
        }
        body += inp + "=" + args[inp];
      }
    }
    req(url, method, body);
    return false;
  }
  
  // low-level HTTP stuff
  function req(url, method, body, content, accept) {
    var ajax = new XMLHttpRequest();
    ajax.onreadystatechange = function(){rsp(ajax)};
    ajax.open(method, url);
    ajax.setRequestHeader("accept",accept||g.atype);
    if(body && body!==null) {
      ajax.setRequestHeader("content-type", content||g.ctype);
    }
    ajax.send(body);
  }
  
  function rsp(ajax) {
    if(ajax.readyState===4) {
      if(ajax.getResponseHeader("content-type").toLowerCase()===g.stype) {
        g.profile = JSON.parse(ajax.responseText);
        parseSiren();
      }
      else {
        g.msg = JSON.parse(ajax.responseText);
        parseMsg();
      }
    }
  }

  // export function
  var that = {};
  that.init = init;
  return that;
}

// *** EOD ***
