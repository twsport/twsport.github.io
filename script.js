document.addEventListener('DOMContentLoaded', () => {
    const loadDataBtn = document.getElementById('loadDataBtn');
    const dataDisplay = document.getElementById('dataDisplay');

    loadDataBtn.addEventListener('click', async () => {
        dataDisplay.innerHTML = '<p>載入中...</p>'; // 顯示載入訊息

        try {
            // 使用 fetch API 從 JSONPlaceholder 獲取使用者資料
            const response = await fetch('https://jsonplaceholder.typicode.com/users');

            // 檢查回應是否成功
            if (!response.ok) {
                throw new Error(`HTTP 錯誤！狀態碼：${response.status}`);
            }

            const users = await response.json(); // 將回應轉換為 JSON 格式

            // 清空舊內容
            dataDisplay.innerHTML = '';

            // 遍歷使用者資料並顯示在網頁上
            users.forEach(user => {
                const userCard = document.createElement('div');
                userCard.classList.add('user-card');
                userCard.innerHTML = `
                    <h3>${user.name}</h3>
                    <p><strong>使用者名稱：</strong> ${user.username}</p>
                    <p><strong>Email：</strong> ${user.email}</p>
                    <p><strong>電話：</strong> ${user.phone}</p>
                    <p><strong>公司：</strong> ${user.company.name}</p>
                `;
                dataDisplay.appendChild(userCard);
            });

        } catch (error) {
            console.error('獲取資料時發生錯誤:', error);
            dataDisplay.innerHTML = `<p style="color: red;">載入資料失敗：${error.message}</p>`;
        }
    });
});
