module.exports = {
    normalizePhone: (phoneNumber) => {
        let regex = /[\s\-+]/g;
        let phone = phoneNumber.replace(regex, '');

        if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1);
        } else if (phone.startsWith('+62')) {
            phone = phone.replace('+', '');
        }

        return phone;
    },
};
