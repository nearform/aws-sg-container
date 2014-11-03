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

var _ = require('lodash');
var fs = require('fs');
var executor = require('nscale-util').executor();
var sd = require('nscale-util').sysdef();
var _ec2;
var _config;
var _mode;

var GROUP_ID = '__GROUP_ID__';
var PROTOCOL = '__PROTOCOL__';
var PORT = '__PORT__';
var CIDR = '__CIDR__';


/**
 * the aws function ec2.authorizeSecurityGroupIngress appears to just not work...
 * this temporary hack creates a set of AWS command line instructions in a single 
 * bash script and executes them to set ingress rules on a given security group
 */
var hackIngress = function(groupId, ipPermissions, out, cb) {
  var ingress = 'aws ec2 authorize-security-group-ingress --group-id __GROUP_ID__ --protocol __PROTOCOL__ --port __PORT__ --cidr __CIDR__\n';
  var script = '';
  var rule = '';

  script = 'export AWS_ACCESS_KEY_ID=' + _config.accessKeyId + '\n';
  script += 'export AWS_SECRET_ACCESS_KEY=' + _config.secretAccessKey + '\n';
  script += 'export AWS_DEFAULT_REGION=' + _config.region + '\n';
  _.each(ipPermissions, function(perm) {
    rule = ingress.replace(GROUP_ID, groupId);
    rule = rule.replace(PROTOCOL, perm.IpProtocol);
    rule = rule.replace(PORT, perm.FromPort);
    rule = rule.replace(CIDR, perm.IpRanges[0].CidrIp);
    script += rule;
  });

  fs.writeFileSync('/tmp/_hackingress.sh', script, 'utf8');
  executor.exec(_mode, 'sh /tmp/_hackingress.sh', '/tmp', out, cb);
};



var handleGroup = function(system, container, out, cb) {
  var sg = container.specific;
  var match = false;
  var sgParams = { GroupIds: [container.nativeId] };

  _ec2.describeSecurityGroups(sgParams, function(err, sgroups) {
    if (sgroups && sgroups.SecurityGroups && sgroups.SecurityGroups.length > 0) {
      match = _.find(sgroups.SecurityGroups, function(group) { return group.GroupId === container.nativeId; });
    }
    if (!match || (err && err.name && -1 !== err.name.indexOf('NotFound'))) {
      _ec2.createSecurityGroup({Description: sg.Description,
                                GroupName: sg.GroupName,
                                VpcId: sg.VpcId}, function(err, resp) {
        if (err) { return cb(err, system); }
        var c = _.find(system.topology.containers, function(cont) { return cont.id === container.id; });
        c.nativeId = resp.GroupId;
        system.dirty = true;
        if (sg.IpPermissions) {
          setTimeout(function() {
            hackIngress(resp.GroupId, sg.IpPermissions, out, function() {
              cb(err, system);
            });
          }, 10000);
        }
      });
    }
    else {
      cb(err);
    }
  });
};



exports.handleSecurityGroup = function(mode, config, ec2, system, container, out, cb) {
  _ec2 = ec2;
  _config = config;
  _mode = mode;

  handleGroup(system, container, out, function(err, newSys) {
    cb(err, newSys);
  });
};

