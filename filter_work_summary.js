let obj = JSON.parse($response.body);

if (obj.Data && obj.Data.rows) {
  // 过滤掉标题中包含"工作总结"或"年度工作目标"的条目
  obj.Data.rows = obj.Data.rows.filter(row => {
    if (row.cells && row.cells[0] && row.cells[0].cellContentHTML) {
      const title = row.cells[0].cellContentHTML;
      return !title.includes('工作总结') && !title.includes('年度工作目标');
    }
    return true;
  });
  
  // 更新数据总数
  if (obj.Data.dataNum) {
    obj.Data.dataNum = obj.Data.rows.length;
  }
}

$done({body: JSON.stringify(obj)}); 
