/** views/auth —— 登录/注册/GitHub OAuth/退出（S6）。事件: site:auth-expired（待接） */
/* 逐字迁移自 src/prototype.js（步骤 S6）；行为变更需走评审。 */

export function authHeaders(){return AUTH.token?{"Authorization":"Bearer "+AUTH.token}:{};}

export function skipLogin(){closeSub("pg-login");toast("当前为游客模式，管理操作需要登录");}

export function doLogin(){
  var u=document.getElementById("loginUser").value.trim();
  var p=document.getElementById("loginPass").value;
  if(!u||!p){loginErr("请输入账号和密码");return;}
  fetch("http://localhost:8000/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username:u,password:p})})
    .then(function(r){if(!r.ok)throw new Error("unauthorized");return r.json();})
    .then(function(j){
      if(j.code!==0)throw new Error(j.message||"登录失败");
      AUTH.token=j.data.accessToken;AUTH.user=j.data;
      try{localStorage.setItem("authToken",AUTH.token);localStorage.setItem("authUser",JSON.stringify({nickname:j.data.nickname,username:j.data.username,avatar:j.data.avatar}));}catch(e){}
      var el=document.getElementById("pg-login");el.style.opacity="0";el.style.transform="scale(.98)";
      setTimeout(function(){closeSub("pg-login");el.style.opacity="";el.style.transform="";},260);
      loginErr("");
      toast("欢迎回来,"+(j.data.nickname||u));
      if(typeof refreshAudit==="function")refreshAudit();
    })
    .catch(function(e){loginErr(e.message==="unauthorized"?"账号或密码错误":"后端未启动,无法登录");});
}

export function setAuthMode(m){
  var l=document.getElementById('am-login'),r=document.getElementById('am-reg');
  var fl=document.getElementById('f-login'),fr=document.getElementById('f-reg');
  if(!l||!r)return;
  l.classList.toggle('on',m==='login');
  r.classList.toggle('on',m==='register');
  fl.style.display=m==='login'?'':'none';
  fr.style.display=m==='register'?'':'none';
  loginErr('');
}

export function doRegister(){
  var u=document.getElementById('regUser').value.trim();
  var n=document.getElementById('regNick').value.trim();
  var p=document.getElementById('regPass').value;
  if(!u||!p){loginErr('账号和密码不能为空');return;}
  fetch("http://localhost:8000/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username:u,password:p,nickname:n})})
    .then(function(r){return r.json().then(function(j){return {status:r.status,j:j};});})
    .then(function(res){
      if(res.status!==200||res.j.code!==0){loginErr((res.j&&(res.j.detail||res.j.message))||'注册失败');return;}
      AUTH.token=res.j.data.accessToken;
      AUTH.user={username:res.j.data.username,nickname:res.j.data.nickname};
      try{localStorage.setItem("authToken",AUTH.token);localStorage.setItem("authUser",JSON.stringify({nickname:res.j.data.nickname,username:res.j.data.username}));}catch(e){}
      var el=document.getElementById("pg-login");
      el.style.opacity="0";el.style.transform="scale(.98)";
      setTimeout(function(){closeSub("pg-login");el.style.opacity="";el.style.transform="";},260);
      loginErr("");
      toast("注册成功，欢迎 "+(res.j.data.nickname||u)+" 🎉");
      if(typeof refreshAudit==="function")refreshAudit();
      draftClear&&draftClear();
    })
    .catch(function(){loginErr('后端未启动，无法注册');});
}

export function oauthTry(kind){
  var names={qq:'QQ',wechat:'微信'};
  fetch('http://localhost:8000/api/auth/'+kind+'/login')
    .then(function(r){return r.json().then(function(j){return {status:r.status,j:j};});})
    .then(function(res){
      if(res.status===501){toast('⚠️ '+names[kind]+'登录需站长在服务端配置开放平台后开放');}
      else if(res.status>=300&&res.status<400||res.headers){toast('正在跳转'+names[kind]+'…');}
      else toast(names[kind]+'登录暂不可用');
    })
    .catch(function(){toast('无法连接后端');});
}

export function loginErr(m){
  var e=document.getElementById("loginErr");
  if(!e)return;
  e.textContent=m;
  if(m){e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake');}
}

export function githubLogin(){
  toast('正在连接 GitHub…');
  fetch(GH_BACK+'/api/auth/github/login',{redirect:'manual'})
    .then(function(r){
      if(r.status===500){toast('⚠️ 后端未配置 GitHub：请在 Kirameku-backend/.env 填 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 后重启');return;}
      if(r.status===404){toast('后端未部署 GitHub 登录接口');return;}
      location.href=GH_BACK+'/api/auth/github/login';
    })
    .catch(function(){toast('无法连接后端 :8000');});
}

export function ghApplyUser(u){
  try{localStorage.setItem('ghUser',JSON.stringify(u));}catch(e){}
  var b=document.getElementById('ghBtnTxt');
  if(b)b.textContent='GitHub · '+u.login;
  document.querySelectorAll('#pg-account .menu-row').forEach(function(row){
    if(row.textContent.indexOf('GitHub 绑定')>-1){
      var st=row.querySelector('span:last-child');
      if(st){st.textContent=u.login;st.style.color='var(--green)';}
    }
  });
}

export function logout(){
  AUTH.token="";AUTH.user=null;
  try{localStorage.removeItem("authToken");localStorage.removeItem("authUser");}catch(e){}
  closeSub("pg-account");openLogin();toast("已退出登录");
}

export function openLogin(){
  var el=document.getElementById("pg-login");
  el.style.opacity="";el.style.transform="";
  el.classList.add("show");
}

export const __exports__ = { authHeaders, skipLogin, doLogin, setAuthMode, doRegister, oauthTry, loginErr, githubLogin, ghApplyUser, logout, openLogin };
