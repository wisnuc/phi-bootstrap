module.exports = {
  cmd: {
    CLOUD_CHANGE_PASSWARD_MESSAGE: "CLOUD_CHANGE_PASSWARD_MESSAGE",
    TO_CLOUD_GET_TOKEN_CMD: 'getToken',
    TO_CLOUD_CONNECT_CMD: 'connect',
    TO_CLOUD_SERVICE_USER_CMD: 'serviceUserList',
    FROM_CLOUD_UNBIND_NOTICE: 'unbind',
    FROM_CLOUD_TOUCH_CMD: 'touch',
    FROM_CLOUD_BIND_CMD: 'bind',
    FROM_APPIFI_STARTED_CMD: 'appifi_started',
    FROM_APPIFI_BOUNDVOLUME_UPDATE_CMD: 'appifi_boundVolume_update',
    FROM_APPIFI_USERS_CMD: 'appifi_users',
    FROM_APPIFI_TOUCH_CMD: 'appifi_touch',
    TO_APPIFI_TOKEN_CMD: 'bootstrap_token',
    TO_APPIFI_DEVICE_CMD: 'bootstrap_device',
    TO_APPIFI_BOUND_USER_CMD: 'bootstrap_boundUser',
    TO_APPIFI_UNBIND_CMD: 'bootstrap_unbind'
  },
  server: {
    port: 9001,
    addr: 'sohon2test.phicomm.com',
    devAddr: 'sohon2dev.phicomm.com'
  },
  chassis: {
    dir: '/mnt/reserved/userdata/phicomm',
    btmp: '/mnt/reserved/userdata/phicomm/btmp'
  }
}