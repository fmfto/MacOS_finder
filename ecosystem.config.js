module.exports = {
  apps: [
    {
      name: 'fm-drive',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // 서버의 실제 데이터 경로로 수정하세요
        NAS_ROOT_DIR: '/home/fm/data' 
      },
    },
  ],
};
