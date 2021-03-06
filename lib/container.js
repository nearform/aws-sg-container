/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var bunyan = require('bunyan');
var aws = require('aws-sdk');
var sg = require('./sg');

module.exports = function(config, logger) {
  var _ec2 = new aws.EC2(config);

  logger = logger || bunyan.createLogger({name: 'blank-container'});

  var deploy = function deploy(mode, target, system, containerDef, container, out, cb) {
    out.preview({cmd: 'check security groups', host: null, user: null, keyPath: null});
    if (mode !== 'preview') {
      sg.handleSecurityGroup(mode, config, _ec2, system, container, out, function(err, newSystem) {
        cb(err, newSystem);
      });
    }
    else {
      cb();
    }
  };



  var undeploy = function undeploy(mode, target, system, containerDef, container, out, cb) {
    cb();
  };



  var start = function start(mode, target, system, containerDef, container, out, cb) {
    cb();
  };



  var stop = function stop(mode, target, system, containerDef, container, out, cb) {
    cb();
  };



  var link = function link(mode, target, system, containerDef, container, out, cb) {
    cb();
  };



  var unlink = function unlink(mode, target, system, containerDef, container, out, cb) {
    cb();
  };



  return {
    deploy: deploy,
    start: start,
    stop: stop,
    link: link,
    unlink: unlink,
    undeploy: undeploy,
    add: deploy,
    remove: undeploy
  };
};
