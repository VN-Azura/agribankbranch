const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

const url = 'https://www.agribank.com.vn/wcm/connect/f19a8ca1-0507-486d-aa95-cb78b559b142/atm-chi-nhanh.js?MOD=AJPERES&attachment=true&id=1570853146584';
const filePath = path.join(__dirname, 'atm-chi-nhanh.js');

// Tạo một agent HTTPS bỏ qua việc xác minh chứng chỉ SSL
const agent = new https.Agent({
    rejectUnauthorized: false
});

// Bước 1: Tải file từ URL và lưu lại
axios.get(url, { responseType: 'stream', httpsAgent: agent })
    .then(response => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            console.log('File đã được tải xuống và lưu lại tại:', filePath);

            // Bước 2: Đọc nội dung file và xử lý sau khi tải xuống
            processFile(filePath);
        });

        writer.on('error', err => {
            console.error('Lỗi khi lưu file:', err);
        });
    })
    .catch(error => {
        console.error('Lỗi khi tải file:', error);
    });

// Bước 3: Xử lý file sau khi tải xuống
function processFile(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Lỗi khi đọc file:', err);
            return;
        }

        // Tìm dòng chứa 'var arrBranch'
        const startIndex = data.indexOf('var arrBranch');
        if (startIndex === -1) {
            console.error('Không tìm thấy dữ liệu arrBranch trong file.');
            return;
        }

        // Tìm vị trí bắt đầu và kết thúc của mảng JSON
        const startArrayIndex = data.indexOf('[', startIndex);
        const endArrayIndex = data.indexOf('];', startArrayIndex) + 1;

        // Lấy chuỗi JSON của mảng arrBranch
        const jsonString = data.substring(startArrayIndex, endArrayIndex);

        // Xóa dòng chứa 'var arrBranch' và mảng JSON của nó
        const newData = data.substring(0, startIndex) + data.substring(endArrayIndex + 1);

        // Chuyển đổi chuỗi JSON thành đối tượng
        let arrBranch = [];
        try {
            arrBranch = JSON.parse(jsonString);
        } catch (error) {
            console.error('Lỗi khi phân tích cú pháp JSON:', error);
            return;
        }

        // Trích xuất chỉ các trường 'id' và 'address'
        const simplifiedData = arrBranch.map(branch => ({
            id: branch.id,
            address: branch.address,
            name: branch.title,
            cn: branch.cn,
        }));
        //lấy các chi nhánh có cn = cn
        const simplifiedDataCN = simplifiedData.filter(branch => branch.cn === 'cn');

        // Lưu lại dữ liệu mới vào file gốc
        fs.writeFile(filePath, newData, 'utf8', err => {
            if (err) {
                console.error('Lỗi khi lưu file:', err);
                return;
            }

            console.log('File đã được xử lý và lưu lại tại:', filePath);
        });

        // Lưu lại dữ liệu arrBranch đã trích xuất vào file JSON
        const jsonFilePath = path.join(__dirname, 'atm-chi-nhanh.json');
        fs.writeFile(jsonFilePath, JSON.stringify(simplifiedDataCN, null, 2), err => {
            if (err) {
                console.error('Lỗi khi lưu file JSON:', err);
                return;
            }

            console.log('Dữ liệu đã được lưu vào file JSON:', jsonFilePath);
        });
    });
}
