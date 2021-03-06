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

exports.handleSecurityGroup = function(mode, config, ec2, system, container, out, cb) {
  var sg = container.specific;
  var match = false;
  var filters = [];
  filters.push({Name: 'tag:nscale-system', Values: [system.name + '-' + system.topology.name]});

  ec2.describeSecurityGroups({ Filters: filters }, function(err, sgroups) {
    var c = _.find(system.topology.containers, function(cont) { return cont.id === container.id; });

    if (sgroups && sgroups.SecurityGroups && sgroups.SecurityGroups.length > 0) {
      match = _.find(sgroups.SecurityGroups, function(group) { return group.GroupName === container.id; });
    }

    if (!match || (err && err.name && -1 !== err.name.indexOf('NotFound'))) {
      ec2.createSecurityGroup({Description: sg.Description,
                                GroupName: container.id,
                                VpcId: sg.VpcId || config.defaultVpcId}, function(err, resp) {
        if (err) {
          if (-1 !== err.name.indexOf('InvalidGroup.Duplicate')) {
            return cb(null, system);
          }
          else {
            return cb(err, system);
          }
        }
        var tagParams = {Resources: [resp.GroupId], Tags: container.specific.tags || []};
        tagParams.Tags.push({Key: 'nscale-system', Value: system.name + '-' + system.topology.name});
        tagParams.Tags.push({Key: 'nscale-id', Value: system.name + '-' + system.topology.name + '-' + container.id});
        tagParams.Tags.push({Key: 'Name', Value: container.id});
        ec2.createTags(tagParams, function() {
          c.nativeId = resp.GroupId;
          c.groupId = resp.GroupId;
          c.specific = _.merge(c.specific || {}, resp);
          system.dirty = true;
          if (sg.IpPermissions) {
            var params = {GroupId : resp.GroupId, IpPermissions : sg.IpPermissions};
            ec2.authorizeSecurityGroupIngress(params, function(err) {
              cb(err, system);
            });
          }
        });
      });
    }
    else {
      if (err && -1 !== err.name.indexOf('InvalidGroup.Duplicate')) {
        cb(err);
      }
      else {
        c.nativeId = match.GroupId;
        c.groupId = match.GroupId;
        c.specific = _.merge(c.specific || {}, match);
        system.dirty = true;
        cb();
      }
    }
  });
};
