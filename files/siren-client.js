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
    
    elm = d.find("links");
    d.clear(elm);

    if(g.msg.links) {
      ul = d.node("ul");
      ul.onclick = httpGet;      
      coll = g.msg.links;
      for(var link of coll) {
        // only render if NOT a "profile" link
        if(link.rel.indexOf("profile")===-1) {
          li = d.node("li");
          a = d.anchor({
            rel:link.rel.join(" "),
            href:link.href,
            text:link.title||link.href, 
            className:link.class.join(" "),
            type:link.type||""
          });
          d.push(a, li);
          d.push(li,ul);
        }
      }
      d.push(ul, elm);
    }
  }

  // entities
  function entities() {
    var elm, coll, cls, sop;
    var ul, li, dl, dt, dd, a, p;
    
    elm = d.find("entities");
    d.clear(elm);
    
    if(g.msg.entities) {
      ul = d.node("ul");
      
      coll = g.msg.entities;
      for(var item of coll) {   
      
        // look up profile    
        cls = item.class[0];
        if(cls) {
          sop = g.profile[cls];
        }
        
        // if we have a profile...
        if(sop) {
          li = d.node("li");
          dl = d.node("dl");
          dt = d.node("dt");
          
          a = d.anchor({
            href:item.href,
            rel:item.rel.join(" "),
            className:item.class.join(" "),
            text:item.title||item.href});
          a.onclick = httpGet;
          d.push(a, dt);
          d.push(dt, dl);

          dd = d.node("dd");
          for(var prop in item) {
            // only show properties from the profile
            if(sop[prop] && sop[prop].display===true) {
              p = d.data({
                className:"item "+item.class.join(" "),
                text:sop[prop].prompt+"&nbsp;",
                value:item[prop]+"&nbsp;"
              });
              d.push(p,dd);
            }
          }
          d.push(dd, dl);
          d.push(dl, li);
          d.push(li, ul);
        }
      }
      d.push(ul, elm);
    }
  }
  
  // actions  
  function actions() {
    var elm, coll;
    var ul, li, frm, lg, fs, fld, inp, p;
    
    elm = d.find("actions");
    d.clear(elm);

    if(g.msg.actions) {
      coll = g.msg.actions;
      ul = d.node("ul");
      for(var act of coll) {
        li = d.node("li");
        frm = d.node("form");
        frm.id = act.name;
        frm.setAttribute("smethod",act.method);
        frm.method = act.method;
        frm.action = act.href;
        frm.onsubmit = httpForm;
        fs = d.node("fieldset");
        lg = d.node("legend");
        lg.innerHTML = act.title;
        d.push(lg, fs);
        for (var fld of act.fields) {
          p = d.input({
            "prompt" : fld.title||fld.name,
            "name" : fld.name,
            "className" : fld.class.join(" "),
            "value" : g.msg.properties[fld.name]||fld.value,
            "type" : fld.type||"text",
            "required" : fld.required||false,
            "readOnly" : fld.readOnly||false,
            "pattern" : fld.pattern||""
          });
          d.push(p,fs);                    
        }
        p = d.node("p");
        inp = d.node("input");
        inp.type = "submit";
        d.push(inp, p);
        d.push(p, fs);
        
        d.push(fs, frm);
        d.push(frm, li);
        d.push(li, ul);
      }
      d.push(ul, elm);
    }
  }  
  
  // properties
  function properties() {
    var elm, coll, cls, sop;
    var ul, dl, dt, dd, a, p;
    
    elm = d.find("properties");
    d.clear(elm);
    
    if(g.msg.class) {
      cls = g.msg.class[0];
    }
    if(cls) {
      sop = g.profile[cls]
    }
    
    if(g.msg.properties) {
      ul = d.node("ul");
      dl = d.node("dl");
      dd = d.node("dd");
      
      if(cls==="error") {
        sop = {};
        dt = d.node("dt");
        a = d.anchor({
          href:g.url,
          rel:"error",
          className:"error",
          text:"Reload"});
          a.onclick = httpGet;
          d.push(a, dt);
          d.push(dt, dl);
      }
      
      coll = g.msg.properties;
      for(var prop in coll) { 
        // only show properties from the profile
        if(sop[prop] && sop[prop].display===true) {
          p = d.data({
            className:"item "+g.msg.class.join(" ")||"",
            text:sop[prop].prompt+"&nbsp;",
            value:coll[prop]+"&nbsp;"
          });
          d.push(p,dd);
        }
        else { 
          // if we're in error mode, show them all
          if(cls==="error") {
            p = d.data({
              className:"item "+g.msg.class.join(" ")||"",
              text:prop+"&nbsp;",
              value:coll[prop]+"&nbsp;"
            });
            d.push(p,dd);
          }
        }
      }
      d.push(dd, dl);
      d.push(dl, elm);
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
