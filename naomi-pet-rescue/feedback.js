'use strict';
const form = document.getElementById('feedbackForm');
const status = document.getElementById('feedbackStatus');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const fields = [['playedAt','试玩日期'],['device','设备与浏览器'],['version','试玩版本'],['independent','孩子自己完成的操作'],['help','需要帮助的地方'],['liked','最喜欢的一处'],['problem','实际操作与问题'],['wish','希望下一次改进']];
  const lines = ['Naomi《小动物回家》家庭试玩反馈','填写者自行填写；此文件尚未提交给老师。','', ...fields.map(([key,label]) => label+'：'+(String(data.get(key)||'').trim()||'未填写'))];
  const blob = new Blob(['\uFEFF'+lines.join('\n\n')+'\n'], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href=url; link.download='naomi-feedback-'+(String(data.get('playedAt')||'').replace(/[^0-9-]/g,'')||'undated')+'.txt';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent='已发起下载。请确认文件已保存，再自行交给 Dean；页面没有上传反馈。';
});
form.addEventListener('reset', () => { status.textContent='表格已清空。此前下载的文件不受影响。'; });
